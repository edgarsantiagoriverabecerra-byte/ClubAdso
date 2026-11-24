document.addEventListener('DOMContentLoaded', () => {
    const logueado = localStorage.getItem('logueado');
    if (logueado !== 'true') {
        window.location.href = 'Login.html';
        return;
    }
    const nombre = localStorage.getItem('nombre');
    const rol = localStorage.getItem('rol');

    const nombreUsuarioEl = document.getElementById('nombreUsuario');
    if (nombreUsuarioEl && nombre) {
        nombreUsuarioEl.textContent = nombre;
    }

    const tarjetasAdmin = document.getElementById('tarjetasAdministrador');
    const tarjetasAsociado = document.getElementById('tarjetasAsociado');

    if (rol === 'admin') {
        if (tarjetasAdmin) tarjetasAdmin.classList.remove('d-none');
        if (tarjetasAsociado) tarjetasAsociado.classList.add('d-none');
    } else {
        if (tarjetasAdmin) tarjetasAdmin.classList.add('d-none');
        if (tarjetasAsociado) tarjetasAsociado.classList.remove('d-none');
    }

    const vincularNavegacion = (id, destino) => {
        const elemento = document.getElementById(id);
        if (!elemento) return;

        const navegar = () => {
            window.location.href = destino;
        };

        elemento.style.cursor = 'pointer';
        elemento.addEventListener('click', navegar);
        elemento.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navegar();
            }
        });
    };

    vincularNavegacion('tarjetaAsociados', 'gestionAsociados.html');
    vincularNavegacion('tarjetaActividades', 'registroActividades.html');
    vincularNavegacion('tarjetaPrestamos', 'registroPrestamos.html');
    vincularNavegacion('tarjetaReportes', 'reportes.html');
    vincularNavegacion('tarjetaPagos', 'reportes.html');

    vincularNavegacion('tarjetaMisDatos', 'misDatos.html');
    vincularNavegacion('tarjetaMisPrestamos', 'misPrestamos.html');
    vincularNavegacion('tarjetaMisActividades', 'registroActividades.html');
    vincularNavegacion('tarjetaMisPagos', 'misPagos.html');
});

async function cerrarSecion() {
    try {
        const respuesta = await fetch("../Modelos/cerrarSesion.php", { method: "POST" });

        if (!respuesta.ok) {
            throw new Error("Error al cerrar sesión en el servidor");
        }
        localStorage.clear();
        window.location.href = 'Login.html';
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        localStorage.clear();
        window.location.href = 'Login.html';
    }
}
