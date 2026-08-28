console.log("🚀 Extensión Comfica Importer (WebGEART / WebGespol) inyectada correctamente.");

function normalizarTexto(txt) {
    return (txt || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

function obtenerMapaCabeceras(filaCabecera) {
    const ths = filaCabecera.querySelectorAll("th");
    const mapa = {};
    ths.forEach((th, idx) => {
        const texto = normalizarTexto(th.innerText);
        if (texto) {
            mapa[texto] = idx;
        }
    });
    return mapa;
}

function buscarIndiceColumna(mapa, posiblesNombres) {
    for (const nombre of posiblesNombres) {
        const claveBuscada = normalizarTexto(nombre);
        for (const [claveTh, idx] of Object.entries(mapa)) {
            if (claveTh === claveBuscada || (claveTh.length >= 4 && claveTh.includes(claveBuscada))) {
                return idx;
            }
        }
    }
    return -1;
}

function intentarInyectarBotones() {
    // Busca la tabla por id dgTra o cualquier DataGrid/tabla similar
    const tabla = document.getElementById("dgTra") || 
                  document.querySelector("table[id*='dg']") || 
                  document.querySelector("table.table");

    if (tabla && !tabla.dataset.importadorInyectado) {
        const filas = Array.from(tabla.querySelectorAll("tr"));
        if (filas.length === 0) return; // Aún no hay filas cargadas

        tabla.dataset.importadorInyectado = "true";
        console.log("✅ Tabla de órdenes encontrada. Inyectando botones...");

        // 1. Inyectamos estilos premium para el botón
        if (!document.getElementById("comfica-importer-style")) {
            const style = document.createElement('style');
            style.id = "comfica-importer-style";
            style.textContent = `
                .btn-import {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 13px;
                    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
                    transition: all 0.2s ease;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    white-space: nowrap;
                }
                .btn-import:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
                    background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
                }
                .btn-import:active {
                    transform: translateY(0);
                }
            `;
            document.head.appendChild(style);
        }

        // 2. Detectar portal (WebGEART, WebGespolT, WebGesvirt)
        const urlActual = window.location.href.toLowerCase();
        const tituloActual = document.title.toLowerCase();
        
        const esWebGespol = urlActual.includes("gespol") || tituloActual.includes("gespol");
        const esWebGesvirt = urlActual.includes("gesvirt") || tituloActual.includes("gesvirt");
        const esWebGEART = urlActual.includes("geart") || tituloActual.includes("geart");

        // Extraemos el mapa de cabeceras de la primera fila antes de modificar el DOM
        const filaCabecera = filas[0];
        const mapaCabeceras = obtenerMapaCabeceras(filaCabecera);

        // Determinamos índices originales (0-based antes de inyectar botón)
        const idxOT = buscarIndiceColumna(mapaCabeceras, ["codigoot", "numot", "numeroot", "ot", "numero"]);
        const idxCliente = buscarIndiceColumna(mapaCabeceras, ["nombrecliente", "cliente", "razonsocial", "titular"]);
        const idxDireccion = buscarIndiceColumna(mapaCabeceras, ["direccion", "domicilio", "calle"]);
        const idxCP = buscarIndiceColumna(mapaCabeceras, ["cp", "codigopostal"]);
        const idxPoblacion = buscarIndiceColumna(mapaCabeceras, ["poblacion", "localidad", "municipio", "ciudad"]);
        const idxTipo = buscarIndiceColumna(mapaCabeceras, ["tipoorden", "tipoordendetalle", "tipotrabajo", "tipo"]);
        const idxRef = buscarIndiceColumna(mapaCabeceras, ["referencia", "ref"]);
        const idxTel1 = buscarIndiceColumna(mapaCabeceras, ["telefono1", "telefono", "movil", "telef", "tel"]);
        const idxTel2 = buscarIndiceColumna(mapaCabeceras, ["telefono2", "tel2"]);
        const idxDesc = buscarIndiceColumna(mapaCabeceras, ["descripcion", "anotacionesinternas", "observaciones", "notas"]);
        const idxCita = buscarIndiceColumna(mapaCabeceras, ["fechacita", "cita", "fechaconcertada"]);

        // 3. Iteramos por todas las filas para inyectar botones
        filas.forEach((fila, index) => {
            const celdasCabecera = fila.querySelectorAll("th");
            
            if (celdasCabecera.length > 0 || index === 0) {
                // Añadimos columna a la cabecera
                const th = document.createElement("th");
                th.textContent = "Importar";
                th.style.textAlign = "center";
                fila.insertBefore(th, fila.firstChild);
            } else {
                // Añadimos columna de datos con el botón
                const td = document.createElement("td");
                td.style.textAlign = "center";
                
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "btn-import";
                btn.innerHTML = "Importar";
                
                // Evento al hacer click en el botón
                btn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const celdas = fila.querySelectorAll("td");
                    // celdas[0] es nuestro botón inyectado.
                    // Por lo tanto, el índice original i se encuentra en celdas[i + 1].
                    const getValor = (idxOriginal, fallbackIdx) => {
                        const i = (idxOriginal !== -1) ? idxOriginal : fallbackIdx;
                        if (i === -1 || i === undefined || i === null) return "";
                        return celdas[i + 1]?.innerText.trim() || "";
                    };

                    let datosFila = {};

                    if (esWebGespol) {
                        // Mapeo específico Gespol (Jazztel / Orange)
                        datosFila = {
                            origen: "WebGespolT",
                            operadora: "JAZZTEL",
                            ot: getValor(idxOT, 4),                     // CodigoOT
                            tipo_webgeart: getValor(idxTipo, 8),        // TipoOrden
                            cliente: getValor(idxCliente, 11),          // NombreCliente
                            direccion: getValor(idxDireccion, 12),      // Direccion
                            cp: getValor(idxCP, 13),                   // CP
                            poblacion: getValor(idxPoblacion, -1),
                            referencia: "",
                            telefono1: getValor(idxTel1, -1),
                            telefono2: getValor(idxTel2, -1),
                            descripcion: "",
                            fecha_cita: getValor(idxCita, 7)
                        };
                    } else if (esWebGesvirt) {
                        // Mapeo GESVIRT (Telefónica / Movistar)
                        datosFila = {
                            origen: "WebGesvirt",
                            operadora: "MOVISTAR",
                            ot: getValor(idxOT, 4),
                            tipo_webgeart: getValor(idxTipo, 8),
                            cliente: getValor(idxCliente, 11),
                            direccion: getValor(idxDireccion, 12),
                            cp: getValor(idxCP, 13),
                            poblacion: getValor(idxPoblacion, -1),
                            referencia: "",
                            telefono1: getValor(idxTel1, -1),
                            telefono2: getValor(idxTel2, -1),
                            descripcion: "",
                            fecha_cita: getValor(idxCita, 7)
                        };
                    } else if (esWebGEART) {
                        // Mapeo específico WebGEART (R-Cable)
                        datosFila = {
                            origen: "WebGEART",
                            operadora: "R-CABLE",
                            ot: getValor(idxOT, 3),                     // Original 3
                            tipo_webgeart: getValor(idxTipo, 4),        // Original 4
                            referencia: getValor(idxRef, 10),           // Original 10
                            poblacion: getValor(idxPoblacion, 17),      // Original 17
                            direccion: getValor(idxDireccion, 18),      // Original 18
                            cp: getValor(idxCP, 19),                   // Original 19
                            cliente: getValor(idxCliente, 28),          // Original 28
                            telefono1: getValor(idxTel1, 29),           // Original 29
                            telefono2: getValor(idxTel2, 30),           // Original 30
                            descripcion: getValor(idxDesc, -1),
                            fecha_cita: getValor(idxCita, -1)
                        };
                    } else {
                        // Detección 100% dinámica por nombres de columnas para cualquier otra tabla de Comfica
                        datosFila = {
                            origen: "Comfica",
                            operadora: "",
                            ot: getValor(idxOT, -1),
                            tipo_webgeart: getValor(idxTipo, -1),
                            referencia: getValor(idxRef, -1),
                            poblacion: getValor(idxPoblacion, -1),
                            direccion: getValor(idxDireccion, -1),
                            cp: getValor(idxCP, -1),
                            cliente: getValor(idxCliente, -1),
                            telefono1: getValor(idxTel1, -1),
                            telefono2: getValor(idxTel2, -1),
                            descripcion: getValor(idxDesc, -1),
                            fecha_cita: getValor(idxCita, -1)
                        };
                    }
                    
                    console.log("🚀 Guardando datos en memoria y abriendo OtGest:", datosFila);
                    
                    // Guardamos los datos en la memoria de la extensión
                    chrome.storage.local.set({ 'datosImportacion': datosFila }, function() {
                        // Abrimos OtGest en una nueva pestaña
                        window.open('https://otgest.com/orders/create', '_blank');
                    });
                });

                td.appendChild(btn);
                fila.insertBefore(td, fila.firstChild);
            }
        });
        console.log("✅ Botones de importación añadidos a la tabla.");
    }
}

// Ejecutar la comprobación cada 1 segundo (espera a que el usuario busque o cargue las órdenes)
const intervalo = setInterval(() => {
    intentarInyectarBotones();
}, 1000);
