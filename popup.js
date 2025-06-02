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

    medicamentos.forEach(nombre => agregarFila(nombre));
  }
});

// 3. Función para agregar fila
function agregarFila(nombre = '') {
  const tbody = document.getElementById('tbodyMedicacion');
  const fila = document.createElement('tr');
  fila.innerHTML = `
    <td><input type="text" list="listaMedicamentos" value="${nombre}"></td>
    <td><input type="text" placeholder="Ej: 10mg"></td>
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
    const doc = new jsPDF();

    const logo = new Image();
    logo.src = "./logo.png"; // Debe estar en la misma carpeta

    logo.onload = () => {
        // 1. Logo centrado arriba
        doc.addImage(logo, "PNG", 80, 10, 50, 20);

        // 2. Nombre y DNI del paciente
        const nombre = document.getElementById("nombrePaciente").textContent.trim();
        const dni = document.getElementById("dniPaciente").textContent.trim();
        doc.setFontSize(14);
        doc.text(`Paciente: ${nombre} - DNI: ${dni}`, 105, 40, { align: "center" });

        // 3. Extraer tabla HTML
        const table = document.getElementById("tablaMedicacion");
        const headers = [];
        const data = [];

        table.querySelectorAll("thead tr th").forEach(th => headers.push(th.textContent.trim()));
        table.querySelectorAll("tbody tr").forEach(row => {
            const rowData = [];
            row.querySelectorAll("td").forEach((cell, idx) => {
                if (idx < headers.length - 1) { // evitar columna "X"
                    const input = cell.querySelector("input");
                    rowData.push(input ? input.value : cell.textContent.trim());
                }
            });
            data.push(rowData);
        });

        // 4. Tabla con estilos centrados y bordes especiales para columnas de horarios
        const columnasHorario = ["mañana", "mediodía", "tarde", "cena"].map(c => c.toLowerCase());

   // Reemplazar configuración de doc.autoTable por esta
doc.autoTable({
    startY: 50,
    head: [[
        "Medicamento / Dosis", "Mañana", "Mediodía", "Tarde", "Noche"
    ]],
    body: data.map(row => {
        const [medicamento, dosis, ...horarios] = row;
        return [`${medicamento} ${dosis}`, ...horarios];
    }),
    styles: {
        halign: 'center',
        valign: 'middle',
        fontSize: 11,
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
    columnStyles: {
        0: { cellWidth: 70 }, // Medicamento / Dosis
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 }
    },
    didDrawCell: function (data) {
        const colIndex = data.column.index;
        const textoColumna = headers[colIndex]?.toLowerCase();
        const columnasHorario = ["mañana", "mediodía", "tarde", "noche"];

        // Ocultar línea entre columnas 0 y 1
        if (colIndex === 1) {
            data.cell.styles.lineLeftWidth = 0;
        }

        // Dibujar solo líneas verticales para columnas de horario
        if (columnasHorario.includes(textoColumna)) {
            doc.setDrawColor(160);
            doc.setLineWidth(0.2);
            doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height); // izquierda
            doc.line(data.cell.x + data.cell.width, data.cell.y, data.cell.x + data.cell.width, data.cell.y + data.cell.height); // derecha
        }

        // Quitar líneas horizontales
        if (data.section === 'body' || data.section === 'head') {
            data.cell.styles.lineWidth = 0;
        }
    },
    tableLineWidth: 0,
    tableLineColor: 255
});


        // 5. Anotaciones
        const anotaciones = document.querySelector("textarea").value.trim();
        if (anotaciones) {
            doc.setFontSize(10);
            doc.text("Anotaciones:", 10, doc.lastAutoTable.finalY + 10);
            const lines = doc.splitTextToSize(anotaciones, 180);
            doc.text(lines, 10, doc.lastAutoTable.finalY + 18);
        }

        // 6. Pie de página
        doc.setFontSize(12);
        doc.setTextColor(100);
        const pieTexto = "Para recetas online enviar foto de esta Tabla a: consultoriopulsar@gmail.com o a nuestro Whatsapp: 223-5606364";
        const pieLineas = doc.splitTextToSize(pieTexto, 180);
        const pieY = 285 - (pieLineas.length - 1) * 6;
        doc.text(pieLineas, 105, pieY, { align: "center" });

        // 7. Guardar PDF
        const filename = `Medicacion${nombre.replace(/ /g, "-") || "paciente"}.pdf`;
        doc.save(filename);
    };
});

