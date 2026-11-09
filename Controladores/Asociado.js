const formulario = document.getElementById("formRegistro");

formulario.addEventListener("submit", async function (event) {
    // Evita recargar la página al enviar el formulario
    event.preventDefault();

    const botonGuardar = formulario.querySelector('button[type="submit"]');
    const mensajeRegistro = document.getElementById("mensajeRegistro");

    // Lee los campos del formulario y los convierte en un objeto
    const asociado = Object.fromEntries(new FormData(formulario).entries());

    if((asociado.password !== asociado.password_confirm)) {
        document.getElementById("mensajeRegistro").textContent = 
        "Las contraseñas no coinciden.";
    }
    delete asociado.password_confirm; // Elimina el campo de confirmación antes de enviar
    
        // Deshabilita el botón mientras se procesa
    if (botonGuardar) botonGuardar.disabled = true; 

    try {
        if (mensajeRegistro) {
            mensajeRegistro.textContent = "Guardando...";
            mensajeRegistro.dataset.tipo = '';
        }

        // Obtiene la URL del action del formulario o usa una ruta relativa por defecto
        const urlDestino = formulario.action || "../Modelo/registrar.php";

        const respuesta = await fetch(urlDestino, { 
            method: "POST", 
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            }, 
            body: JSON.stringify(asociado) 
        });

        // Validar si la respuesta del servidor es correcta en texto antes de parsear a JSON
        const textoRespuesta = await respuesta.text();
        let resultado;
        
        try {
            resultado = JSON.parse(textoRespuesta);
        } catch (e) {
            console.error("La respuesta del servidor no es un JSON válido:", textoRespuesta);
            throw new Error("El servidor no devolvió un JSON válido.");
        }

        if (mensajeRegistro) {
            mensajeRegistro.textContent = resultado.mensaje || "Operación procesada.";
        }

        if (respuesta.ok && resultado.success) {
            formulario.reset(); // Limpia el formulario si la respuesta es exitosa
        }

    } catch (error) {
        console.error("Error al enviar el formulario:", error);
        if (mensajeRegistro) {
            mensajeRegistro.textContent = "Error al enviar el formulario. Por favor, inténtelo de nuevo.";
            mensajeRegistro.dataset.tipo = 'error';
        }
    } finally {
        // Habilita el botón de guardar nuevamente
        if (botonGuardar) botonGuardar.disabled = false; 
    }
});