console.log("🚀 Extensión Importer (WebGEART / WebGespol / WebGesvirt / POLAR) inyectada correctamente.");

// 1. Funciones auxiliares de normalización y validación
function normalizarTexto(txt) {
    return (txt || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
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
    return str.replace(/[^\d]/g, '').replace(/^34/, '');
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

function detectarPortal() {
    const url = window.location.href.toLowerCase();
    const titulo = document.title.toLowerCase();

    if (url.includes("polar-tecnicos.orange.es") || url.includes("polar") || titulo.includes("field service management")) {
        return { origen: "POLAR", operadora: "ORANGE", esPolar: true, esGespol: false, esGesvirt: false, esGeart: false };
    }
    if (url.includes("gespol") || titulo.includes("gespol")) {
        return { origen: "WebGespolT", operadora: "JAZZTEL", esPolar: false, esGespol: true, esGesvirt: false, esGeart: false };
    }
    if (url.includes("gesvirt") || titulo.includes("gesvirt")) {
        return { origen: "WebGesvirt", operadora: "MOVISTAR", esPolar: false, esGespol: false, esGesvirt: true, esGeart: false };
    }
    if (url.includes("geart") || titulo.includes("geart")) {
        return { origen: "WebGEART", operadora: "R-CABLE", esPolar: false, esGespol: false, esGesvirt: false, esGeart: true };
    }
    return { origen: "Comfica", operadora: "", esPolar: false, esGespol: false, esGesvirt: false, esGeart: false };
}

function inyectarEstilos() {
    if (!document.getElementById("comfica-importer-style")) {
        const style = document.createElement("style");
        style.id = "comfica-importer-style";
        style.textContent = `
            .btn-import {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white !important;
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
                text-decoration: none;
            }
            .btn-import:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
                background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
                color: white !important;
            }
            .btn-import:active {
                transform: translateY(0);
            }
            .btn-import-detalle {
                padding: 8px 16px;
                font-size: 14px;
                margin-left: 15px;
                vertical-align: middle;
            }
            .btn-import-polar {
                margin-top: 8px;
                width: 100%;
                display: block;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }
}

// 2. Inyección en la pantalla de Detalle (Detalle.aspx de WebGEART, WebGespolT y WebGesvirTv1)
function inyectarBotonEnDetalle() {
    const getVal = (...ids) => {
        for (const id of ids) {
            const el = document.getElementById(id) || document.querySelector(`input[name="${id}"], textarea[name="${id}"]`);
            if (el && el.value && el.value.trim()) return el.value.trim();
        }
        return "";
    };

    // Buscamos OT o Cliente soportando campos de WebGEART (*Tra) y WebGespol/WebGesvirt (*OT, *Cli)
    const ot = getVal("txtNumTra", "txtNumOT", "txtIdOT", "txtOT", "txtCodigoOT", "lblNumTra", "lblNumOT");
    const cliente = getVal("txtCliTra", "txtNomCli", "txtCliente", "txtNombreCliente", "lblCliTra", "lblNomCli");

    if ((ot || cliente) && !document.getElementById("btnImportarDetalle")) {
        inyectarEstilos();

        const portal = detectarPortal();
        const btn = document.createElement("button");
        btn.id = "btnImportarDetalle";
        btn.type = "button";
        btn.className = "btn-import btn-import-detalle";
        btn.innerHTML = "Importar a OtGest";

        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            const otVal = getVal("txtNumTra", "txtNumOT", "txtIdOT", "txtOT", "txtCodigoOT");
            const clienteVal = getVal("txtCliTra", "txtNomCli", "txtCliente", "txtNombreCliente");
            const direccionVal = getVal("txtDirTra", "txtDirCli", "txtDireccion", "txtDomicilio");
            const cpVal = getVal("txtCodPosTra", "txtCpCli", "txtCP", "txtCodPostal");
            const poblacionVal = getVal("txtPobTra", "txtMunCli", "txtPoblacion", "txtMunicipio", "txtLocalidad");
            
            // Teléfonos (móvil y fijo en GEART, o campo general en Gespol/Gesvirt)
            const telRaw = getVal("txtTelMovCliTra", "txtTelCli", "txtTelefono", "txtTel", "txtTel1", "txtContacto", "txtTelefono1");
            const tel2Raw = getVal("txtTelFijCliTra", "txtTel2", "txtTelefono2", "txtTelCli2");
            
            const tipoVal = getVal("txtTipTra", "txtNomOT", "txtTipoOT", "txtTipoOrden", "txtTipoTrabajo", "txtTipo");
            const citaVal = getVal("txtFecTra", "txtFecCit", "txtFechaCita", "txtCita");
            
            // Referencia o Id Hueco
            let refVal = getVal("txtRef", "txtReferencia", "txtNumRef");
            const comentarios = getVal("txtComInsTra", "txtAnotacionesInternas", "txtObservaciones");
            if (!refVal && comentarios) {
                const matchHueco = comentarios.match(/Id\s*Hueco:\s*(\d+)/i);
                if (matchHueco) refVal = matchHueco[1];
            }

            const tel1Limpio = limpiarTelefono(telRaw);
            const tel2Limpio = limpiarTelefono(tel2Raw);

            const datosFila = {
                origen: portal.origen,
                operadora: portal.operadora,
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

        // Insertar junto al encabezado de Datos Trabajo o en el contenedor principal
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

// 3. Inyección en portal POLAR (polar-tecnicos.orange.es)
function inyectarEnPolar() {
    const portal = detectarPortal();
    if (!portal.esPolar) return;

    inyectarEstilos();

    // A) Inyección en listado de órdenes (Dashboard)
    // Seleccionamos solo el elemento principal dentro de la tarjeta para no duplicar botones
    const itemsOt = document.querySelectorAll(".item-ot-listado a.list-group-item, #ordenes-list a.list-group-item");
    itemsOt.forEach((item) => {
        if (item.dataset.importadorInyectado || item.querySelector(".btn-import-polar")) return;

        const elCodigo = item.querySelector(".codigo");
        if (!elCodigo || !elCodigo.innerText.trim()) return; // No es un elemento de orden con código

        item.dataset.importadorInyectado = "true";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-import btn-import-polar";
        btn.innerHTML = "Importar a OtGest";

        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();

            const otVal = item.querySelector(".codigo")?.innerText.trim() || "";
            const nombre = (item.querySelector(".nombre")?.innerText || "").trim();
            const apellidos = (item.querySelector(".apellidos")?.innerText || "").trim();
            
            let clienteVal = "";
            if (nombre && apellidos) {
                if (nombre.toLowerCase() === apellidos.toLowerCase()) {
                    clienteVal = nombre;
                } else if (nombre.toLowerCase().includes(apellidos.toLowerCase())) {
                    clienteVal = nombre;
                } else if (apellidos.toLowerCase().includes(nombre.toLowerCase())) {
                    clienteVal = apellidos;
                } else {
                    clienteVal = `${nombre} ${apellidos}`.trim();
                }
            } else {
                clienteVal = nombre || apellidos || "";
            }

            const direccionVal = item.querySelector(".direccion")?.innerText.trim() || "";
            const cpVal = item.querySelector(".cp")?.innerText.trim() || "";
            const telRaw = item.querySelector(".telefono")?.innerText.trim() || "";
            const tipoVal = item.querySelector(".tipo-ot")?.innerText.trim() || "";
            const marca = item.querySelector(".marca")?.innerText.trim().toUpperCase() || "";
            const citaVal = item.querySelector(".hora-asignacion")?.innerText.trim() || item.querySelector(".hora")?.innerText.trim() || "";

            let operadora = "ORANGE";
            if (marca.includes("JAZZTEL")) operadora = "JAZZTEL";
            else if (marca.includes("SIMYO")) operadora = "SIMYO";
            else if (marca.includes("MASMOVIL") || marca.includes("MÁSMÓVIL")) operadora = "MASMOVIL";
            else if (marca) operadora = marca;

            const tel1Limpio = limpiarTelefono(telRaw);

            const datosFila = {
                origen: "POLAR",
                operadora: operadora,
                ot: otVal,
                tipo_webgeart: tipoVal,
                cliente: clienteVal,
                direccion: direccionVal,
                cp: cpVal,
                poblacion: "",
                referencia: "",
                telefono1: tel1Limpio,
                telefono2: "",
                descripcion: "",
                fecha_cita: citaVal
            };

            console.log("🚀 Importando desde POLAR:", datosFila);
            chrome.storage.local.set({ 'datosImportacion': datosFila }, function() {
                window.open('https://otgest.com/orders/create', '_blank');
            });
        });

        item.appendChild(btn);
    });

    // B) Inyección en Modal de Cita de POLAR (#ModalDetallesCita)
    const modalCita = document.getElementById("ModalDetallesCita");
    if (modalCita && !modalCita.querySelector("#btnImportarModalPolar")) {
        const modalHeader = modalCita.querySelector(".modal-header");
        if (modalHeader) {
            const btnModal = document.createElement("button");
            btnModal.id = "btnImportarModalPolar";
            btnModal.type = "button";
            btnModal.className = "btn-import";
            btnModal.innerHTML = "Importar a OtGest";
            btnModal.style.marginLeft = "15px";

            btnModal.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                const otVal = document.getElementById("detalleCita_ordenTrabajo")?.value.trim() || "";
                const clienteVal = document.getElementById("detalle_ClienteDocumento")?.value.trim() || "";
                const cpVal = document.getElementById("detalle_codigoPostal")?.value.trim() || "";
                const dia = document.getElementById("nuevaCitaModalDiaHueco")?.value.trim() || "";
                const hora = document.getElementById("nuevaCitaModalHoraHueco")?.value.trim() || "";
                const citaVal = (dia + " " + hora).trim();
                const tipoVal = document.getElementById("detalleCita_subzona")?.value.trim() || "";

                const datosFila = {
                    origen: "POLAR",
                    operadora: "ORANGE",
                    ot: otVal,
                    tipo_webgeart: tipoVal,
                    cliente: clienteVal,
                    direccion: "",
                    cp: cpVal,
                    poblacion: "",
                    referencia: "",
                    telefono1: "",
                    telefono2: "",
                    descripcion: "",
                    fecha_cita: citaVal
                };

                console.log("🚀 Importando desde Modal POLAR:", datosFila);
                chrome.storage.local.set({ 'datosImportacion': datosFila }, function() {
                    window.open('https://otgest.com/orders/create', '_blank');
                });
            });

            modalHeader.appendChild(btnModal);
        }
    }
}

// 4. Escanear números de teléfono en celdas de una fila (validación estricta)
function escanearTelefonosFila(celdas, otExcluir, cpExcluir) {
    const encontrados = [];
    const patron = /(?:(?:\+|00)34[\s.-]*)?([6789]\d{2}[\s.-]*\d{3}[\s.-]*\d{3}|\b[6789]\d{8}\b)/g;

    celdas.forEach((celda, idx) => {
        if (idx === 0) return; // Ignorar columna del botón inyectado
        const texto = celda.innerText.trim();
        if (!texto) return;
        // Ignorar textos descriptivos
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
}

// 5. Inyección en la tabla principal de órdenes (Menu.aspx / lista de Comfica)
function intentarInyectarBotones() {
    const portal = detectarPortal();

    // 1. Si estamos en POLAR
    if (portal.esPolar) {
        inyectarEnPolar();
        return;
    }

    // 2. Si estamos en una página de Detalle, SOLO inyectamos el botón superior y NO tocamos las tablas
    const esPaginaDetalle = window.location.href.toLowerCase().includes("detalle") || 
                            Boolean(document.getElementById("txtNumTra") || document.getElementById("txtNumOT") || 
                                    document.getElementById("txtIdOT") || document.getElementById("txtCliTra") || 
                                    document.getElementById("txtNomCli"));

    if (esPaginaDetalle) {
        inyectarBotonEnDetalle();
        return; // Salir para no inyectar en tablas secundarias como Baremos o Materiales
    }

    // 3. Busca la tabla principal de órdenes en páginas de lista/menú de Comfica
    const tabla = document.getElementById("dgTra") || 
                  document.querySelector("table[id*='dgTra']");

    if (tabla && !tabla.dataset.importadorInyectado) {
        const filas = Array.from(tabla.querySelectorAll("tr"));
        if (filas.length === 0) return;

        // Comprobamos que la tabla sea la de órdenes y no de baremos/materiales
        const filaCabecera = filas[0];
        const mapaCabeceras = obtenerMapaCabeceras(filaCabecera);

        // Determinamos índices de columnas
        const idxOT = buscarIndiceColumna(mapaCabeceras, ["codigoot", "numot", "numeroot", "ot", "numtra"]);
        const idxCliente = buscarIndiceColumna(mapaCabeceras, ["nombrecliente", "cliente", "razonsocial", "titular", "clitra"]);

        // Debe tener al menos columna de OT o Cliente
        if (idxOT === -1 && idxCliente === -1) {
            return; // No es la tabla de órdenes de trabajo
        }

        tabla.dataset.importadorInyectado = "true";
        console.log("✅ Tabla principal de órdenes encontrada. Inyectando botones...");

        inyectarEstilos();

        const idxDireccion = buscarIndiceColumna(mapaCabeceras, ["direccion", "domicilio", "calle", "dirtra"]);
        const idxCP = buscarIndiceColumna(mapaCabeceras, ["cp", "codigopostal", "codpostra"]);
        const idxPoblacion = buscarIndiceColumna(mapaCabeceras, ["poblacion", "localidad", "municipio", "ciudad", "pobtra"]);
        const idxTipo = buscarIndiceColumna(mapaCabeceras, ["tipoorden", "tipoordendetalle", "tipotrabajo", "tiptra"]);
        const idxRef = buscarIndiceColumna(mapaCabeceras, ["referencia"]);
        const idxTel1 = buscarIndiceColumna(mapaCabeceras, ["telefono1", "telefono", "tfno1", "tfno", "tlf1", "tlf", "contacto", "movil", "telmovclitra"]);
        const idxTel2 = buscarIndiceColumna(mapaCabeceras, ["telefono2", "tfno2", "tlf2", "movil2", "telfijclitra"]);
        const idxCita = buscarIndiceColumna(mapaCabeceras, ["fechacita", "cita", "fechaconcertada", "fectra"]);

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

                    if (portal.esGespol) {
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
                    } else if (portal.esGesvirt) {
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
                    } else if (portal.esGeart) {
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
                        window.open('https://otgest.com/orders/create', '_blank');
                    });
                });

                td.appendChild(btn);
                fila.insertBefore(td, fila.firstChild);
            }
        });
        console.log("✅ Botones de importación añadidos a la tabla principal.");
    }
}

// Ejecutar la comprobación cada 1 segundo
const intervalo = setInterval(() => {
    intentarInyectarBotones();
}, 1000);
