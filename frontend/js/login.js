/* =====================================================
   ELEMENTOS
====================================================== */

const loginForm = document.getElementById('loginForm');
const usuarioInput = document.getElementById('usuario');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');
const togglePassword = document.getElementById('togglePassword');
const recoveryModal = document.getElementById('recoveryModal');

/* =====================================================
   SI YA HAY SESIÓN, ENTRAR DIRECTO AL PANEL
====================================================== */

if (TH.Auth.usuarioActual()) {
  window.location.href = 'panel.html';
}

/* =====================================================
   ACCESOS RÁPIDOS DE DEMOSTRACIÓN (uno por rol)
====================================================== */

const demoUsersGrid = document.getElementById('demoUsersGrid');

const demoPorRol = TH.DB.roles().map(rol => {
  const usuario = TH.DB.usuarios().find(u => u.rolId === rol.id && u.estado === 'Activo');
  return usuario ? { rol, usuario } : null;
}).filter(Boolean);

demoUsersGrid.innerHTML = demoPorRol.map(({ rol, usuario }) => `
  <button type="button" class="demo-user-btn" data-correo="${usuario.correo}" data-password="${usuario.password}">
    <span class="demo-user-btn__rol">${rol.nombre}</span>
    <span class="demo-user-btn__nombre">${usuario.nombre}</span>
  </button>
`).join('');

demoUsersGrid.addEventListener('click', event => {
  const btn = event.target.closest('.demo-user-btn');
  if (!btn) return;
  usuarioInput.value = btn.dataset.correo;
  passwordInput.value = btn.dataset.password;
  loginForm.requestSubmit();
});

/* =====================================================
   MOSTRAR / OCULTAR CONTRASEÑA
====================================================== */

togglePassword.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePassword.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
});

/* =====================================================
   RECORDAR USUARIO
====================================================== */

const savedUser = localStorage.getItem('loginUsuario');

if (savedUser) {
  usuarioInput.value = savedUser;
  document.getElementById('remember').checked = true;
}

/* =====================================================
   LOGIN
====================================================== */

loginForm.addEventListener('submit', event => {
  event.preventDefault();

  const usuario = usuarioInput.value.trim();
  const password = passwordInput.value;

  errorMessage.classList.remove('show');

  if (!usuario || !password) {
    showError('Completa todos los campos para ingresar.');
    return;
  }

  loginBtn.classList.add('loading');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Verificando...';

  setTimeout(() => {

    const resultado = TH.Auth.intentarLogin(usuario, password);

    if (resultado.ok) {

      if (document.getElementById('remember').checked) {
        localStorage.setItem('loginUsuario', usuario);
      } else {
        localStorage.removeItem('loginUsuario');
      }

      window.location.href = 'panel.html';

    } else {

      showError(resultado.error);
      loginBtn.disabled = false;
      loginBtn.classList.remove('loading');
      loginBtn.textContent = 'Ingresar al sistema';

    }

  }, 500);

});

/* =====================================================
   MOSTRAR ERROR
====================================================== */

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
}

/* =====================================================
   RECUPERAR CONTRASEÑA
====================================================== */

document.getElementById('forgotPassword').addEventListener('click', event => {
  event.preventDefault();
  recoveryModal.classList.add('open');
});

document.getElementById('closeModal').addEventListener('click', () => {
  recoveryModal.classList.remove('open');
});

recoveryModal.addEventListener('click', event => {
  if (event.target === recoveryModal) {
    recoveryModal.classList.remove('open');
  }
});

document.getElementById('recoveryBtn').addEventListener('click', () => {
  const email = document.getElementById('recoveryEmail').value.trim();

  if (!email) {
    alert('Ingresa tu correo electrónico.');
    return;
  }

  alert('Si el correo está registrado, recibirás las instrucciones para recuperar tu contraseña.');
  recoveryModal.classList.remove('open');
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    recoveryModal.classList.remove('open');
  }
});
