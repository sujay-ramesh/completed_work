document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.querySelector('.toggle-sidebar-btn');
  const body = document.querySelector('body');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      body.classList.toggle('toggle-sidebar');
    });
  }
});