document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch('../Modelos/sesion.php');
        if (respuesta.status === 401) {
            window.location.href = 'Login.html';
            return;
        }
        if (!respuesta.ok) {
            throw new Error('No fue posible validar la sesión');
        }

        const resultado = await respuesta.json();
        const usuario = resultado.usuario;
        document.getElementById('nombreUsuario').textContent = usuario.nombre;
        document.getElementById('tarjetasAdministrador').classList.add('d-none');
        document.getElementById('tarjetasAsociados').classList.remove('d-none');
    } catch (error) {
        console.error('Error al validar la sesión:', error);
        document.getElementById('nombreUsuario').textContent =
            'No fue posible validar la sesión. Recarga la página para intentarlo de nuevo.';
    }
});


async function cerrarSesion() {
    try {
        const respuesta = await fetch('../Modelos/cerrarSesion.php', { method: 'POST' });
        if (!respuesta.ok) {
            throw new Error('No fue posible cerrar la sesión');
        }
        window.location.href = 'Login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('No fue posible cerrar la sesión. Verifique la conexión e inténtelo de nuevo.');
    }
}