function showSidebar() {

  const html = HtmlService
    .createTemplateFromFile("Sidebar")
    .evaluate()
    .setTitle("Finance AI");

  SpreadsheetApp.getUi().showSidebar(html);

}