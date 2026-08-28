// Este script se ejecuta automáticamente cuando entramos a https://otgest.com/orders/create

// 1. Verificamos si hay datos guardados en la memoria de la extensión
chrome.storage.local.get(['datosImportacion'], function(result) {
    if (result.datosImportacion) {
        console.log("🚀 Datos importados encontrados en memoria:", result.datosImportacion);
        
        const datos = result.datosImportacion;
        
        // 2. Rellenar los campos del formulario usando sus IDs
        
        // Número de orden (OT)
        const inputOt = document.getElementById('ot_numero');
        if (inputOt && datos.ot) {
            inputOt.value = datos.ot;
            // Disparamos el evento 'input' para que la validación de duplicados de OtGest se entere
            inputOt.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Cliente
        const inputCliente = document.getElementById('ot_cliente');
        if (inputCliente && datos.cliente) {
            inputCliente.value = datos.cliente;
            inputCliente.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Dirección (unimos calle, CP y población según estén disponibles)
        const inputDireccion = document.getElementById('ot_direccion');
        if (inputDireccion) {
            let partesDireccion = [];
            if (datos.direccion) partesDireccion.push(datos.direccion);
            if (datos.cp && !datos.direccion?.includes(datos.cp)) partesDireccion.push(datos.cp);
            if (datos.poblacion && !datos.direccion?.includes(datos.poblacion)) partesDireccion.push("(" + datos.poblacion + ")");
            
            inputDireccion.value = partesDireccion.join(" - ");
            inputDireccion.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Operadora (JAZZTEL para Gespol, R-CABLE para WebGEART, o la indicada)
        const inputOperadora = document.getElementById('ot_operadora');
        if (inputOperadora) {
            if (datos.operadora) {
                inputOperadora.value = datos.operadora;
            } else if (datos.origen === "WebGespolT") {
                inputOperadora.value = "JAZZTEL";
            } else if (datos.origen === "WebGEART") {
                inputOperadora.value = "R-CABLE";
            }
            inputOperadora.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Tipo de Trabajo
        const inputTipo = document.getElementById('ot_tipo');
        if (inputTipo && datos.tipo_webgeart) {
            let tipo = datos.tipo_webgeart.toLowerCase();
            if (tipo.includes('avería') || tipo.includes('averia') || tipo.includes('incidencia') || tipo.includes('rep')) {
                inputTipo.value = "AVERIA";
            } else if (tipo.includes('modificaci')) {
                inputTipo.value = "MODIFICACION";
            } else if (tipo.includes('instalaci') || tipo.includes('alta') || tipo.includes('ftth') || tipo.includes('ggcc')) {
                inputTipo.value = "INSTALACION";
            } else if (tipo.includes('traslado')) {
                inputTipo.value = "TRASLADO";
            } else if (tipo.includes('baja')) {
                inputTipo.value = "BAJA";
            } else if (tipo.includes('auditoria')) {
                inputTipo.value = "AUDITORIA";
            }
            inputTipo.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Teléfono de Contacto
        const inputContacto = document.getElementById('ot_contacto');
        if (inputContacto) {
            let telefonos = [];
            if (datos.telefono1) telefonos.push(datos.telefono1);
            if (datos.telefono2) telefonos.push(datos.telefono2);
            if (telefonos.length > 0) {
                inputContacto.value = telefonos.join(' / ');
                inputContacto.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        // Comentarios (Detalles técnicos)
        const inputTxt = document.getElementById('ot_txt');
        if (inputTxt) {
            let comentariosExtra = "";
            if (datos.referencia) {
                comentariosExtra = `Ref ${datos.origen || "Origen"}: ${datos.referencia}\n\n`;
            }
            
            // Si hay referencia, la añadimos al principio; si no, se deja limpio
            if (comentariosExtra) {
                inputTxt.value = comentariosExtra + inputTxt.value;
                inputTxt.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        // 3. Limpiamos la memoria para que no se autocompleten datos viejos en accesos manuales posteriores
        chrome.storage.local.remove('datosImportacion');
        console.log("✅ Formulario rellenado correctamente y memoria limpiada.");
    }
});
