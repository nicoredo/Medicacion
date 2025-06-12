// 1. Inyectar content.js al abrir el popup
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  console.log("🔍 Inyectando content.js...");
  chrome.scripting.executeScript({
    target: { tabId: tabs[0].id },
    files: ['content.js']
  }, () => {
    console.log("✅ content.js inyectado, enviando popupListo...");
    chrome.tabs.sendMessage(tabs[0].id, { tipo: 'popupListo' });
  });
});

// 2. Recibir datos del paciente
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📨 popup recibió mensaje:", request);
  if (request.tipo === 'datosPaciente') {
    const { nombreCompleto, dni, medicamentos } = request.payload;

    console.log("🧾 Nombre:", nombreCompleto, "DNI:", dni);
    console.log("💊 Medicamentos recibidos:", medicamentos);

    document.getElementById('nombrePaciente').innerText = nombreCompleto;
    document.getElementById('dniPaciente').innerText = dni;
    // Limpiar tabla antes de agregar nuevas filas
    document.getElementById('tbodyMedicacion').innerHTML = '';

    medicamentos.forEach(nombreDosis => {
  const match = nombreDosis.match(/^(.*?)\s+(\d+.*)$/);
  const nombre = match ? match[1] : nombreDosis;
  const dosis = match ? match[2] : '';
  agregarFila(nombre, dosis);
});
  }
});

// 3. Función para agregar fila
function agregarFila(nombre = '', dosis = "") {
  const tbody = document.getElementById('tbodyMedicacion');
  const fila = document.createElement('tr');
  fila.innerHTML = `
    <td><input type="text" list="listaMedicamentos" value="${nombre}"></td>
  <td><input type="text" value="${dosis}" placeholder="Ej: 10mg"></td>
    <td><input type="text"></td>
    <td><input type="text"></td>
    <td><input type="text"></td>
    <td><input type="text"></td>
    <td><button class="remove-btn">X</button></td>
  `;
  tbody.appendChild(fila);

  // Agregar comportamiento al botón "X"
  const botonEliminar = fila.querySelector('.remove-btn');
  botonEliminar.addEventListener('click', () => fila.remove());
}

// 4. Para botones desde HTML
function agregarFilaManual() {
  agregarFila('');
}

function limpiarTabla() {
  const tbody = document.getElementById('tbodyMedicacion');
  if (tbody) {
    tbody.innerHTML = '';
    console.log("🧼 Tabla de medicación limpiada.");
  } else {
    console.error("❌ No se encontró tbodyMedicacion.");
  }
}

// 5. Exponer funciones globalmente
window.agregarFila = agregarFila;
window.agregarFilaManual = agregarFilaManual;
window.limpiarTabla = limpiarTabla;

// 6. Listeners seguros para botones (sin onclick)
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnAgregar')?.addEventListener('click', agregarFilaManual);
  document.getElementById('btnLimpiar')?.addEventListener('click', limpiarTabla);
  document.getElementById('btnImprimir')?.addEventListener('click', () => {
    console.log("🖨 Ejecutando window.print()");
    window.print();
  });
  document.getElementById('btnCerrar')?.addEventListener('click', () => window.close());

  const btnMinimizar = document.getElementById('btnMinimizar');
  if (btnMinimizar) {
    btnMinimizar.addEventListener('click', () => {
      const tabla = document.getElementById('tablaMedicacion');
      const controles = document.querySelectorAll('.btn, textarea, h3');
      controles.forEach(el => {
        el.style.display = (el.style.display === 'none' ? '' : 'none');
      });
      tabla.style.display = (tabla.style.display === 'none' ? '' : 'none');
    });
  }

  // Cargar lista medicamentos
  fetch(chrome.runtime.getURL('terminologia_medica.json'))
    .then(res => res.json())
    .then(data => {
      const nombres = Object.keys(data.medicacion);
      const datalist = document.getElementById('listaMedicamentos');
      nombres.forEach(nombre => {
        const option = document.createElement('option');
        option.value = nombre;
        datalist.appendChild(option);
      });
    })
    .catch(err => console.error("Error cargando terminologia_medica:", err));
});

      // Generar PDF

document.getElementById("btnPDF").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });

  const logo = new Image();
  logo.src = "./logo.png";

  logo.onload = () => {
    doc.addImage(logo, "PNG", 120, 10, 50, 20); // centrado aprox

    const nombre = document.getElementById("nombrePaciente").textContent.trim();
    const dni = document.getElementById("dniPaciente").textContent.trim();
    doc.setFontSize(16);
    doc.text(`Paciente: ${nombre} - DNI: ${dni}`, 148, 40, { align: "center" });

    const table = document.getElementById("tablaMedicacion");
    const headers = [];
    const data = [];

    table.querySelectorAll("thead tr th").forEach(th => headers.push(th.textContent.trim()));
    table.querySelectorAll("tbody tr").forEach(row => {
      const rowData = [];
      row.querySelectorAll("td").forEach((cell, idx) => {
        if (idx < headers.length - 1) {
          const input = cell.querySelector("input");
          rowData.push(input ? input.value : cell.textContent.trim());
        }
      });
      data.push(rowData);
    });

    // 🧩 autoTable sin errores de ancho
    doc.autoTable({
      startY: 50,
      head: [["Medicamento / Dosis", "Mañana", "Mediodía", "Tarde", "Noche"]],
      body: data.map(row => {
        const [medicamento, dosis, ...horarios] = row;
        return [`${medicamento} ${dosis}`, ...horarios];
      }),
      styles: {
        halign: 'center',
        valign: 'middle',
        fontSize: 13,
        lineWidth: 0.2,
        lineColor: [180, 180, 180]
      },
      headStyles: {
        fillColor: [180, 210, 255],
        textColor: 20,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 250, 255]
      },
      tableWidth: "auto" // 👉 evita errores por ancho fijo
    });

    const anotaciones = document.querySelector("textarea").value.trim();
    if (anotaciones) {
      doc.setFontSize(12);
      doc.text("Anotaciones:", 10, doc.lastAutoTable.finalY + 10);
      const lines = doc.splitTextToSize(anotaciones, 270);
      doc.text(lines, 10, doc.lastAutoTable.finalY + 18);
    }

    doc.setFontSize(12);
    doc.setTextColor(100);
    const pieTexto = "Para recetas online enviar foto de esta Tabla a: consultoriopulsar@gmail.com o a nuestro Whatsapp: 223-5606364";
    const pieLineas = doc.splitTextToSize(pieTexto, 270);
    const pieY = 200 + (doc.lastAutoTable.finalY || 60);
    doc.text(pieLineas, 148, pieY, { align: "center" });

    // 📄 Mostrar el PDF en nueva pestaña y disparar impresión
   const blob = doc.output("blob");
const url = URL.createObjectURL(blob);
const win = window.open(url);
if (win) {
  win.onload = () => {
    win.focus();
    win.print();
  };
} else {
  alert("Por favor permití ventanas emergentes para imprimir el PDF.");
}

  };
});
