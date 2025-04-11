const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxeo9SDouL90aQH7ardpQKi_8bbj4vg_jq1JefSsg-1EOKTtWKRKLjvyEDKZ6wmrOLr/exec";

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('form-cadastro');
  
  // Carrega categorias existentes
  await carregarCategorias();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Coletar dados do formulário
    const categoria = form.querySelector('#categoria').value.trim();
    const item = form.querySelector('#item').value.trim();
    const quantidade = form.querySelector('#quantidade').value;
    const unidade = form.querySelector('#unidade').value;
    let preco = form.querySelector('#preco').value || '0,00';
    preco = preco.toString().replace('.', ','); // Converte ponto para vírgula

    // Validação dos campos
    if (!categoria || !item || !quantidade || unidade === '' || preco === '0,00') {
      mostrarNotificacao('Por favor, preencha todos os campos corretamente!', 'warning');
      return; // Impede o envio do formulário
    }

    const btnCadastrar = document.getElementById('btn-cadastrar');
    btnCadastrar.disabled = true;
    btnCadastrar.textContent = 'Cadastrando...';

    const params = new URLSearchParams();
    params.append('categoria', categoria);
    params.append('nome', item);
    params.append('quantidade', quantidade);
    params.append('unidade', unidade);
    params.append('preco', preco);

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      });
      
      const result = await response.text();
      console.log(result);
      
      if (!response.ok) throw new Error(result);
      
      mostrarNotificacao('Item cadastrado com sucesso!', 'success');
      form.reset();
      await carregarCategorias(); // Recarrega categorias
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      mostrarNotificacao('Erro ao cadastrar item. Tente novamente.', 'error');
    } finally {
      btnCadastrar.disabled = false;
      btnCadastrar.textContent = '✓ Cadastrar Item';
    }
  });
});

async function carregarCategorias() {
  try {
    const response = await fetch(`${SCRIPT_URL}?getCategories=true`);
    const categorias = await response.json();
    const datalist = document.getElementById('categorias');
    
    datalist.innerHTML = '';
    categorias.forEach(categoria => {
      const option = document.createElement('option');
      option.value = categoria;
      datalist.appendChild(option);
    });
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
    mostrarNotificacao('Erro ao carregar categorias', 'error');
  }
}

// Função para mostrar notificações personalizadas
function mostrarNotificacao(mensagem, tipo = 'info', tempo = 3000) {
  // Tipos: 'success', 'error', 'warning', 'info'
  const icones = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };
  
  // Cria o elemento da notificação
  const notificacao = document.createElement('div');
  notificacao.className = `notificacao ${tipo}`;
  notificacao.innerHTML = `<i>${icones[tipo]}</i> ${mensagem}`;
  
  // Adiciona ao corpo do documento
  document.body.appendChild(notificacao);
  
  // Mostra a notificação
  setTimeout(() => {
    notificacao.classList.add('show');
  }, 10);
  
  // Remove a notificação após o tempo especificado
  setTimeout(() => {
    notificacao.classList.add('hide');
    notificacao.addEventListener('animationend', () => {
      notificacao.remove();
    });
  }, tempo);
}