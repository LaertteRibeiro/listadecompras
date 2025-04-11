// Configurações
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbze9rKXsd2kG9OGnrOT45vAYzg8Fe7vD3PUfwI9WOf9T8Zpf9tUJhdWB3KU8EKa5DC4/exec";
const OFFLINE_DATA_KEY = "listaComprasOffline";
const PENDING_UPDATES_KEY = "listaComprasPendentes";

// Elementos da página
const listaElement = document.getElementById('lista');
const atualizarBtn = document.getElementById('atualizar');
const statusOffline = document.querySelector('.status-offline') || createStatusOfflineElement();

function createStatusOfflineElement() {
  const element = document.createElement('div');
  element.className = 'status-offline';
  document.body.appendChild(element);
  return element;
}

// Carrega a lista
async function carregarLista() {
  try {
    let itens;
    
    if (navigator.onLine) {
      const response = await fetch(SCRIPT_URL);
      if (!response.ok) throw new Error("Erro na resposta do servidor");
      const data = await response.json();
      itens = data.slice(1); // Remove cabeçalho
      salvarDadosLocal(OFFLINE_DATA_KEY, itens);
      statusOffline.textContent = '';
    } else {
      itens = carregarDadosLocal(OFFLINE_DATA_KEY) || [];
      statusOffline.textContent = itens.length 
        ? '⚠ Modo offline - Trabalhando com dados locais' 
        : '⚠ Modo offline - Nenhum dado local disponível';
    }
    
    exibirItens(itens);
  } catch (error) {
    console.error("Erro ao carregar lista:", error);
    const itens = carregarDadosLocal(OFFLINE_DATA_KEY) || [];
    exibirItens(itens);
    mostrarNotificacao('Erro ao carregar dados online', 'error');
  }
}

// Exibe os itens na tela
function exibirItens(itens) {
  if (!itens || itens.length === 0) {
    listaElement.innerHTML = '<div class="item vazio">Nenhum item encontrado</div>';
    return;
  }

  calcularTotais(itens); //exibir valor total da lsita

  // Ordena: não riscados primeiro
  itens.sort((a, b) => a[5] - b[5]);
  
  listaElement.innerHTML = itens.map(item => `
    <div class="item ${item[5] ? 'riscado' : ''}" 
         onclick="marcarItem('${escapeItem(item[1])}', ${!item[5]}, this)"
         data-item="${escapeItem(item[1])}">
      <div class="item-info">
        <div class="item-nome">${item[1]}</div>
        <div class="item-detalhes">${item[2]} ${item[3]} - R$ ${item[4]}</div>
      </div>
    </div>
  `).join('');
}

// Marca item como comprado/não comprado
async function marcarItem(itemNome, comprado, element) {
  // Feedback visual imediato
  element.classList.toggle('riscado', comprado);
  
  // Animação
  element.style.transform = 'scale(0.98)';
  setTimeout(() => element.style.transform = 'scale(1)', 200);
  
  // Atualiza localmente primeiro
  const itens = carregarDadosLocal(OFFLINE_DATA_KEY) || [];
  const itemIndex = itens.findIndex(item => item[1] === itemNome);
  
  if (itemIndex !== -1) {
    // Atualiza o status do item
    itens[itemIndex][5] = comprado;
    
    // Reordena os itens localmente
    itens.sort((a, b) => a[5] - b[5]);
    
    // Salva a nova ordem
    salvarDadosLocal(OFFLINE_DATA_KEY, itens);
    
    // Reexibe os itens (agora ordenados)
    exibirItens(itens);
  }
  
  // Restante do código de sincronização...
  if (navigator.onLine) {
    try {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `itemNome=${encodeURIComponent(itemNome)}&comprado=${comprado}`
      });
      
      const result = await response.text();
      console.log("Resposta do servidor:", result);
      
      if (!response.ok) throw new Error(result);
      
    } catch (error) {
      console.error("Erro ao sincronizar com o servidor:", error);
      adicionarAtualizacaoPendente(itemNome, comprado);
    }
  } else {
    adicionarAtualizacaoPendente(itemNome, comprado);
    statusOffline.textContent = '⚠ Modo offline - Alteração salva localmente';
  }
}

function adicionarAtualizacaoPendente(itemNome, comprado) {
  const pendentes = carregarDadosLocal(PENDING_UPDATES_KEY) || [];
  // Remove atualizações duplicadas para o mesmo item
  const novasPendentes = pendentes.filter(p => p.itemNome !== itemNome);
  novasPendentes.push({ itemNome, comprado, timestamp: Date.now() });
  salvarDadosLocal(PENDING_UPDATES_KEY, novasPendentes);
}

// Sincroniza pendentes quando online
async function sincronizarPendentes() {
  if (!navigator.onLine) return;
  
  const pendentes = carregarDadosLocal(PENDING_UPDATES_KEY) || [];
  if (pendentes.length === 0) return;

  try {
    for (const update of pendentes) {
      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `itemNome=${encodeURIComponent(update.itemNome)}&comprado=${update.comprado}`
      });
      
      if (!response.ok) throw new Error(await response.text());
    }
    
    // Limpa pendentes após sincronização bem-sucedida
    salvarDadosLocal(PENDING_UPDATES_KEY, []);

    mostrarNotificacao('Alterações sincronizadas com sucesso!', 'success');

    setTimeout(() => statusOffline.textContent = '', 3000);
    
    // Recarrega a lista para garantir sincronização
    setTimeout(carregarLista, 1000);
    
  } catch (error) {
    console.error("Erro ao sincronizar pendentes:", error);
    statusOffline.textContent = '⚠ Erro ao sincronizar alterações pendentes';
  }
}

// Armazenamento local
function salvarDadosLocal(chave, dados) {
  try {
    localStorage.setItem(chave, JSON.stringify(dados));
  } catch (error) {
    console.error("Erro ao salvar dados locais:", error);
  }
}

function carregarDadosLocal(chave) {
  try {
    const dados = localStorage.getItem(chave);
    return dados ? JSON.parse(dados) : null;
  } catch (error) {
    console.error("Erro ao carregar dados locais:", error);
    return null;
  }
}

// Escapa caracteres especiais
function escapeItem(text) {
  return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Atualiza Lista 
atualizarBtn.addEventListener('click', async () => {
  const icone = atualizarBtn.querySelector('.icone-atualizar');
  
  // Ativa os estados
  atualizarBtn.classList.add('atualizando');
  icone.classList.add('girando');
  atualizarBtn.disabled = true;
  
  try {
    await carregarLista();
  } catch (error) {
    console.error("Erro ao atualizar:", error);
    statusOffline.textContent = '⚠ Erro ao atualizar a lista';
    setTimeout(() => statusOffline.textContent = '', 3000);
  } finally {
    setTimeout(() => {
      icone.classList.remove('girando');
      atualizarBtn.classList.remove('atualizando');
      atualizarBtn.disabled = false;
    }, 500);
  }
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  if (!navigator.onLine) {
    mostrarNotificacao('Modo offline - Trabalhando com dados locais', 'warning');
  }
  carregarLista();
});

// Expõe funções globais
window.marcarItem = marcarItem;
window.carregarLista = carregarLista;


// Função MENU
const menu = document.getElementById('menu');
const toggle = document.querySelector('.menu-toggle');

function toggleMenu() {
    menu.classList.toggle('show');
}

// Fecha o menu se clicar fora dele
document.addEventListener('click', function (event) {
    const isClickInsideMenu = menu.contains(event.target);
    const isClickOnToggle = toggle.contains(event.target);

    if (!isClickInsideMenu && !isClickOnToggle) {
        menu.classList.remove('show');
    }
});

// caucula o total da lista de comprars
function calcularTotais(itens) {
  const totalItens = itens.filter(item => !item[5]).length;

  // Trata valores com vírgula ou ponto e converte para número
  const totalValor = itens
    .filter(item => !item[5])
    .reduce((soma, item) => soma + parseFloat(String(item[4]).replace(',', '.')), 0);

  // Atualiza os elementos no HTML
  const totalItensElement = document.getElementById('total-itens');
  const totalValorElement = document.getElementById('total-valor');

  if (totalItensElement && totalValorElement) {
    totalItensElement.textContent = ` ${totalItens}`;
    totalValorElement.textContent = ` R$ ${totalValor.toFixed(2).replace('.', ',')}`;
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



// Exemplo de informação
mostrarNotificacao('Sincronizando dados...', 'info');

