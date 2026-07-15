function removeApplicationMenu(Menu) {
  if (Menu && typeof Menu.setApplicationMenu === "function") Menu.setApplicationMenu(null);
}

module.exports = { removeApplicationMenu };
