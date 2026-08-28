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

function esTelefonoValido(str) {
    if (!str) return false;
    // Si contiene letras (ej: "solicitado"), no es un teléfono
    if (/[a-zA-Z]/.test(str)) return false;
    const digitos = str.replace(/[^\d]/g, '').replace(/^34/, '');
    return (digitos.length === 9 && /^[6789]/.test(digitos));
}

function limpiarTelefono(str) {
    if (!str) return "";
    if (!esTelefonoValido(str)) return "";
    const digitos = str.replace(/[^\d]/g, '').replace(/^34/, '');
    return digitos;
}

function buscarIndiceColumna(mapa, posiblesNombres) {
    for (const nombre of posiblesNombres) {
        const claveBuscada = normalizarTexto(nombre);
        for (const [claveTh, idx] of Object.entries(mapa)) {
            // Coincidencia exacta
            if (claveTh === claveBuscada) {
                return idx;
            }
            // Coincidencia de prefijo (ej: "telefono1", "telefono2" con "telefono")
            if (claveBuscada.length >= 5 && claveTh.startsWith(claveBuscada)) {
                return idx;
            }
            // Coincidencia contenida pero solo si el término de búsqueda es largo (para no coincidir "tel" con "jazztel")
            if (claveBuscada.length >= 6 && claveTh.includes(claveBuscada)) {
                return idx;
            }
        }
    }
    return -1;
}

function inyectarBotonEnDetalle() {
    // Detecta si estamos en una página de Detalle (Detalle.aspx, Detalle, etc.)
    const getVal = (...ids) => {
        for (const id of ids) {
            const el = document.getElementById(id) || document.querySelector(`input[name="${id}"], textarea[name="${id}"]`);
            if (el && el.value && el.value.trim()) return el.value.trim();
        }
        return "";
    };

    const ot = getVal("txtNumOT", "txtIdOT", "txtOT", "txtCodigoOT", "lblNumOT");
    const cliente = getVal("txtNomCli", "txtCliente", "txtNombreCliente", "lblNomCli");

    if ((ot || cliente) && !document.getElementById("btnImportarDetalle")) {
        const urlActual = window.location.href.toLowerCase();
        const tituloActual = document.title.toLowerCase();
        
        const esWebGespol = urlActual.includes("gespol") || tituloActual.includes("gespol");
        const esWebGesvirt = urlActual.includes("gesvirt") || tituloActual.includes("gesvirt");
        const esWebGEART = urlActual.includes("geart") || tituloActual.includes("geart");

        // 1. Estilos
        if (!document.getElementById("comfica-importer-style")) {
            const style = document.createElement('style');
            style.id = "comfica-importer-style";
            style.textContent = `
                .btn-import {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
                    transition: all 0.2s ease;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
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

        // 2. Crear botón
        const btn = document.createElement("button");
        btn.id = "btnImportarDetalle";
        btn.type = "button";
        btn.className = "btn-import";
        btn.innerHTML = "⚡ Importar Orden a OtGest";
        btn.style.marginLeft = "15px";
        btn.style.verticalAlign = "middle";

        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            const otVal = getVal("txtNumOT", "txtIdOT", "txtOT", "txtCodigoOT");
            const clienteVal = getVal("txtNomCli", "txtCliente", "txtNombreCliente");
            const direccionVal = getVal("txtDirCli", "txtDireccion", "txtDomicilio");
            const cpVal = getVal("txtCpCli", "txtCP", "txtCodPostal");
            const poblacionVal = getVal("txtMunCli", "txtPoblacion", "txtMunicipio", "txtLocalidad");
            const telRaw = getVal("txtTelCli", "txtTelefono", "txtTel", "txtTel1", "txtContacto", "txtTelefono1");
            const tel2Raw = getVal("txtTel2", "txtTelefono2", "txtTelCli2");
            const tipoVal = getVal("txtNomOT", "txtTipoOT", "txtTipoOrden", "txtTipoTrabajo", "txtTipo");
            const citaVal = getVal("txtFecCit", "txtFechaCita", "txtCita");
            const refVal = getVal("txtRef", "txtReferencia", "txtNumRef");
            
            const tel1Limpio = limpiarTelefono(telRaw);
            const tel2Limpio = limpiarTelefono(tel2Raw);

            let operadora = "JAZZTEL";
            let origen = "WebGespolT";

            if (esWebGesvirt) {
                operadora = "MOVISTAR";
                origen = "WebGesvirt";
            } else if (esWebGEART) {
                operadora = "R-CABLE";
                origen = "WebGEART";
            }

            const datosFila = {
                origen: origen,
                operadora: operadora,
                ot: otVal,
                tipo_webgeart: tipoVal,
                cliente: clienteVal,
                direccion: direccionVal,
                cp: cpVal,
                poblacion: poblacionVal,
                referencia: refVal,
                telefono1: tel1Limpio,
                telefono2: tel2Limpio,
                descripcion: "",
                fecha_cita: citaVal
            };

            console.log("🚀 Importando desde pantalla de Detalle:", datosFila);
            chrome.storage.local.set({ 'datosImportacion': datosFila }, function() {
                window.open('https://otgest.com/orders/create', '_blank');
            });
        });

        // Insertar junto al encabezado de Datos Trabajo o en el encabezado principal
        const encabezado = Array.from(document.querySelectorAll("h4, h5")).find(el => {
            const t = el.innerText.toLowerCase();
            return t.includes("datos") || t.includes("trabajo") || t.includes("orden");
        });
        
        if (encabezado) {
            encabezado.appendChild(btn);
        } else {
            const container = document.querySelector(".container") || document.body;
            container.insertBefore(btn, container.firstChild);
        }
        console.log("✅ Botón de importación añadido a la pantalla de Detalle.");
    }
}

function intentarInyectarBotones() {
    // 1. Si estamos en una página de Detalle, SOLO inyectamos el botón superior y NO tocamos las tablas
    const esPaginaDetalle = window.location.href.toLowerCase().includes("detalle") || 
                            Boolean(document.getElementById("txtNumOT") || document.getElementById("txtIdOT") || document.getElementById("txtNomCli"));

    if (esPaginaDetalle) {
        inyectarBotonEnDetalle();
        return; // Salir para no inyectar en tablas secundarias como Baremos o Materiales
    }

    // 2. Busca la tabla principal de órdenes en páginas de lista/menú
    const tabla = document.getElementById("dgTra") || 
                  document.querySelector("table[id*='dgTra']");

    if (tabla && !tabla.dataset.importadorInyectado) {
        const filas = Array.from(tabla.querySelectorAll("tr"));
        if (filas.length === 0) return;

        // Comprobamos que la tabla sea la de órdenes y no de baremos/materiales
        const filaCabecera = filas[0];
        const mapaCabeceras = obtenerMapaCabeceras(filaCabecera);
        
        // Debe tener al menos columna de OT o Cliente
        const idxOT = buscarIndiceColumna(mapaCabeceras, ["codigoot", "numot", "numeroot", "ot"]);
        const idxCliente = buscarIndiceColumna(mapaCabeceras, ["nombrecliente", "cliente", "razonsocial", "titular"]);
        
        if (idxOT === -1 && idxCliente === -1) {
            return; // No es la tabla de órdenes de trabajo
        }

        tabla.dataset.importadorInyectado = "true";
        console.log("✅ Tabla principal de órdenes encontrada. Inyectando botones...");

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
        const idxOT = buscarIndiceColumna(mapaCabeceras, ["codigoot", "numot", "numeroot", "ot"]);
        const idxCliente = buscarIndiceColumna(mapaCabeceras, ["nombrecliente", "cliente", "razonsocial", "titular"]);
        const idxDireccion = buscarIndiceColumna(mapaCabeceras, ["direccion", "domicilio", "calle"]);
        const idxCP = buscarIndiceColumna(mapaCabeceras, ["cp", "codigopostal"]);
        const idxPoblacion = buscarIndiceColumna(mapaCabeceras, ["poblacion", "localidad", "municipio", "ciudad"]);
        const idxTipo = buscarIndiceColumna(mapaCabeceras, ["tipoorden", "tipoordendetalle", "tipotrabajo"]);
        const idxRef = buscarIndiceColumna(mapaCabeceras, ["referencia"]);
        const idxTel1 = buscarIndiceColumna(mapaCabeceras, ["telefono1", "telefono", "tfno1", "tfno", "tlf1", "tlf", "contacto", "movil"]);
        const idxTel2 = buscarIndiceColumna(mapaCabeceras, ["telefono2", "tfno2", "tlf2", "movil2"]);
        const idxDesc = buscarIndiceColumna(mapaCabeceras, ["descripcion", "anotacionesinternas", "observaciones", "notas"]);
        const idxCita = buscarIndiceColumna(mapaCabeceras, ["fechacita", "cita", "fechaconcertada"]);

        // Función para escanear números de teléfono válidos (9 dígitos empezando por 6, 7, 8 o 9) en las celdas
        const escanearTelefonosFila = (celdas, otExcluir, cpExcluir) => {
            const encontrados = [];
            const patron = /(?:(?:\+|00)34[\s.-]*)?([6789]\d{2}[\s.-]*\d{3}[\s.-]*\d{3}|\b[6789]\d{8}\b)/g;
            
            celdas.forEach((celda, idx) => {
                const texto = celda.innerText.trim();
                if (!texto) return;
                // Si el texto es una palabra común como "solicitado", "pendiente", etc., ignorar
                if (texto.toLowerCase().includes("solicitado") || texto.toLowerCase().includes("finalizado")) return;
                
                let match;
                while ((match = patron.exec(texto)) !== null) {
                    const digitos = match[0].replace(/[^\d]/g, '').replace(/^34/, '');
                    if (digitos.length === 9 && digitos !== otExcluir && digitos !== cpExcluir) {
                        if (!encontrados.includes(digitos)) {
                            encontrados.push(digitos);
                        }
                    }
                }
            });
            return encontrados;
        };

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
                    
                    const celdas = Array.from(fila.querySelectorAll("td"));
                    const getValor = (idxOriginal, fallbackIdx) => {
                        const i = (idxOriginal !== -1) ? idxOriginal : fallbackIdx;
                        if (i === -1 || i === undefined || i === null) return "";
                        return celdas[i + 1]?.innerText.trim() || "";
                    };

                    let datosFila = {};

                    if (esWebGespol) {
                        const ot = getValor(idxOT, 4);
                        const cp = getValor(idxCP, 13);
                        const telefonosDetectados = escanearTelefonosFila(celdas, ot, cp);
                        const tel1Raw = getValor(idxTel1, -1);
                        const tel2Raw = getValor(idxTel2, -1);

                        datosFila = {
                            origen: "WebGespolT",
                            operadora: "JAZZTEL",
                            ot: ot,
                            tipo_webgeart: getValor(idxTipo, 8),
                            cliente: getValor(idxCliente, 11),
                            direccion: getValor(idxDireccion, 12),
                            cp: cp,
                            poblacion: getValor(idxPoblacion, -1),
                            referencia: "",
                            telefono1: limpiarTelefono(tel1Raw) || telefonosDetectados[0] || "",
                            telefono2: limpiarTelefono(tel2Raw) || telefonosDetectados[1] || "",
                            descripcion: "",
                            fecha_cita: getValor(idxCita, 7)
                        };
                    } else if (esWebGesvirt) {
                        const ot = getValor(idxOT, 4);
                        const cp = getValor(idxCP, 13);
                        const telefonosDetectados = escanearTelefonosFila(celdas, ot, cp);
                        const tel1Raw = getValor(idxTel1, -1);
                        const tel2Raw = getValor(idxTel2, -1);

                        datosFila = {
                            origen: "WebGesvirt",
                            operadora: "MOVISTAR",
                            ot: ot,
                            tipo_webgeart: getValor(idxTipo, 8),
                            cliente: getValor(idxCliente, 11),
                            direccion: getValor(idxDireccion, 12),
                            cp: cp,
                            poblacion: getValor(idxPoblacion, -1),
                            referencia: "",
                            telefono1: limpiarTelefono(tel1Raw) || telefonosDetectados[0] || "",
                            telefono2: limpiarTelefono(tel2Raw) || telefonosDetectados[1] || "",
                            descripcion: "",
                            fecha_cita: getValor(idxCita, 7)
                        };
                    } else if (esWebGEART) {
                        const ot = getValor(idxOT, 3);
                        const cp = getValor(idxCP, 19);
                        const telefonosDetectados = escanearTelefonosFila(celdas, ot, cp);
                        const tel1Raw = getValor(idxTel1, 29);
                        const tel2Raw = getValor(idxTel2, 30);

                        datosFila = {
                            origen: "WebGEART",
                            operadora: "R-CABLE",
                            ot: ot,
                            tipo_webgeart: getValor(idxTipo, 4),
                            referencia: getValor(idxRef, 10),
                            poblacion: getValor(idxPoblacion, 17),
                            direccion: getValor(idxDireccion, 18),
                            cp: cp,
                            cliente: getValor(idxCliente, 28),
                            telefono1: limpiarTelefono(tel1Raw) || telefonosDetectados[0] || "",
                            telefono2: limpiarTelefono(tel2Raw) || telefonosDetectados[1] || "",
                            descripcion: "",
                            fecha_cita: getValor(idxCita, -1)
                        };
                    } else {
                        const ot = getValor(idxOT, -1);
                        const cp = getValor(idxCP, -1);
                        const telefonosDetectados = escanearTelefonosFila(celdas, ot, cp);
                        const tel1Raw = getValor(idxTel1, -1);
                        const tel2Raw = getValor(idxTel2, -1);

                        datosFila = {
                            origen: "Comfica",
                            operadora: "",
                            ot: ot,
                            tipo_webgeart: getValor(idxTipo, -1),
                            referencia: getValor(idxRef, -1),
                            poblacion: getValor(idxPoblacion, -1),
                            direccion: getValor(idxDireccion, -1),
                            cp: cp,
                            cliente: getValor(idxCliente, -1),
                            telefono1: limpiarTelefono(tel1Raw) || telefonosDetectados[0] || "",
                            telefono2: limpiarTelefono(tel2Raw) || telefonosDetectados[1] || "",
                            descripcion: "",
                            fecha_cita: getValor(idxCita, -1)
                        };
                    }
                    
                    console.log("🚀 Guardando datos en memoria y abriendo OtGest:", datosFila);
                    
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
