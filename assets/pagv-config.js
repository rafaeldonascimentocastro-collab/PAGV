/* PAGV online — configuração.
   endpoint: URL do "App da Web" do Google Apps Script que grava as respostas numa Planilha Google
             (passo a passo em arquivos/pagv-planilha-google.txt). Vazio = não grava na planilha.
   emailEndpoint: cópia de cada resposta por e-mail (FormSubmit, o mesmo serviço do pré-diagnóstico).
             Vazio = não envia e-mail. Com os dois vazios, o respondente recebe um código para enviar ao consultor.
   minPorNivel: número mínimo de respondentes para mostrar o resultado de um nível (anonimato). */
window.PAGV_CONFIG = {
  endpoint: '',
  emailEndpoint: 'https://formsubmit.co/ajax/growthetc@gmail.com',
  whatsapp: '5511999022351',
  minPorNivel: 3
};
