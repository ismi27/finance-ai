function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("💰 Finance AI")
    .addItem("Open", "showSidebar")
    .addToUi();
}