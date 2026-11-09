const formulario = document.getElementById("formLogin");
const mensaje = document.getElementById("mensajeLogin");

formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    const botonIngresar = formulario.querySelector('button[type="submit"]');
    const credenciales = Object.fromEntries(new FormData(formulario).entries());

    botonIngresar.disabled = true;
    mensaje.textContent = "Verificando...";

    try {
        const respuesta = await fetch(formulario.action, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credenciales)
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.success) {
            mensaje.textContent = resultado.mensaje || "Correo o contraseña incorrectos.";
            return;
        }

        window.location.href = "dashboard.html";
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        mensaje.textContent = "No fue posible iniciar sesión. Verifique la conexión e inténtelo de nuevo.";
    } finally {
        botonIngresar.disabled = false;
    }
});
