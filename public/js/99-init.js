// Make kontak picker backdrop show/hide properly (uses display:flex like akun picker)
const _kpBd = document.getElementById('kontak-picker-backdrop');
if (_kpBd) {
  Object.defineProperty(_kpBd, '_openState', { writable: true, value: false });
  const _origOpen = _kpBd.classList.add.bind(_kpBd.classList);
  _kpBd.classList.add = function(cls) {
    if (cls === 'open') { _kpBd.style.display = 'flex'; return; }
    _origOpen(cls);
  };
  _kpBd.classList.remove = function(cls) {
    if (cls === 'open') { _kpBd.style.display = 'none'; return; }
    HTMLElement.prototype.classList.remove.call(_kpBd, cls);
  };
}
