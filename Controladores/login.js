const formulario = document.getElementById("formLogin");

if (formulario) {
    formulario.addEventListener("submit", async function (e) {
        e.preventDefault();

        const boton = formulario.querySelector('button[type="submit"]');
        const mensaje = document.getElementById("mensajeLogin");

        if (boton) boton.disabled = true;
        if (mensaje) mensaje.textContent = "";

        const datos = Object.fromEntries(new FormData(formulario).entries());

        try {
            const respuesta = await fetch(formulario.action, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(datos)
            });

            let resultado = {};
            try {
                resultado = await respuesta.json();
            } catch {
                resultado = {};
            }

            if (!respuesta.ok || !resultado.success) {
                if (mensaje) {
                    mensaje.textContent =
                        resultado.message ||
                        "No fue posible iniciar sesión, verifique su usuario o contraseña.";
                }
                if (boton) boton.disabled = false;
                return;
            }

            localStorage.setItem("logueado", "true");
            if (resultado.rol) localStorage.setItem("rol", resultado.rol);
            if (resultado.nombre) localStorage.setItem("nombre", resultado.nombre);

            window.location.href = "dashboard.html";
        } catch (error) {
            console.error("Error al iniciar sesión:", error);
            if (mensaje) {
                mensaje.textContent =
                    "Ocurrió un error al iniciar sesión, por favor vuelve a intentarlo.";
            }
            if (boton) boton.disabled = false;
        }
    });
}