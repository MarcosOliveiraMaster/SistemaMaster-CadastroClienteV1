// Configurações de animação e validação para o formulário de clientes
class ClienteAnimacoes {
    constructor() {
        this.currentSection = 1;
        this.estudantesData = [];
        this.ajustesFinaisData = {
            mesmoEndereco: true,
            cepAulas: '',
            enderecoAulas: '',
            cidadeUFAulas: '',
            complementoAulas: '',
            confirmaNF: true,
            nfNome: '',
            nfEndereco: '',
            nfCpf: '',
            nfEmail: ''
        };
        this.init();
    }

    init() {
        this.setupMasks();
        this.setupEventListeners();
        this.setupCPFValidation();
        this.setupEstudantesSection();
        this.setupInputAnimations();
        this.setupAjustesFinaisSection();
        console.log('✅ Animacoes inicializadas');
    }

    // ========== ANIMAÇÕES DOS CAMPOS ==========
    setupInputAnimations() {
        // Configura animações para todos os campos de input
        document.addEventListener('DOMContentLoaded', () => {
            const inputs = document.querySelectorAll('.input-field');
            inputs.forEach(input => {
                // Verifica se o campo já tem valor (útil para recarregamentos)
                if (input.value) {
                    input.classList.add('has-value');
                }
                
                input.addEventListener('focus', () => {
                    input.classList.add('focused');
                });
                
                input.addEventListener('blur', () => {
                    if (!input.value) {
                        input.classList.remove('focused');
                    }
                });
                
                input.addEventListener('input', () => {
                    if (input.value) {
                        input.classList.add('has-value');
                    } else {
                        input.classList.remove('has-value');
                    }
                });
            });
        });
    }

    // ========== MÁSCARAS DE ENTRADA ==========
    setupMasks() {
        this.setupMaskCPF();
        this.setupMaskTelefone();
        this.setupMaskCEP();
    }

    setupMaskCPF() {
        const cpfField = document.getElementById('cpf');
        if (!cpfField) return;

        cpfField.addEventListener('input', async e => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            
            e.target.value = value;
            
            // Verifica se CPF está completo
            const cpfNumeros = value.replace(/\D/g, '');
            if (cpfNumeros.length === 11) {
                await this.validateCPF(cpfNumeros);
            } else {
                this.clearCPFMessage();
            }
        });
    }

    setupMaskTelefone() {
        const telefoneField = document.getElementById('contato');
        if (!telefoneField) return;

        telefoneField.addEventListener('input', e => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            
            let formatted = '';
            if (value.length > 0) {
                formatted = '(' + value.substring(0, 2);
            }
            if (value.length > 2) {
                if (value.length >= 11) {
                    formatted += ') ' + value.substring(2, 7) + '-' + value.substring(7, 11);
                } else {
                    formatted += ') ' + value.substring(2, 6) + (value.length > 6 ? '-' + value.substring(6) : '');
                }
            }
            
            e.target.value = formatted;
            this.validateSection2();
        });
    }

    setupMaskCEP() {
        const cepField = document.getElementById('cep');
        if (!cepField) return;

        const tryBuscar = (val) => {
            const numeric = (val || '').replace(/\D/g, '');
            if (numeric.length === 8) {
                const formatted = numeric.replace(/(\d{5})(\d)/, '$1-$2');
                cepField.value = formatted;
                this.buscarCEP(numeric);
            }
        };

        cepField.addEventListener('input', e => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 8) value = value.slice(0, 8);
            if (value.length > 5) {
                value = value.replace(/(\d{5})(\d)/, '$1-$2');
            }
            e.target.value = value;
            this.validateSection2();

            if (value.replace(/\D/g, '').length === 8) {
                this.buscarCEP(value.replace(/\D/g, ''));
            }
        });

        cepField.addEventListener('paste', (ev) => {
            setTimeout(() => tryBuscar(cepField.value), 50);
        });

        cepField.addEventListener('blur', (ev) => {
            tryBuscar(ev.target.value);
        });
    }

    // ========== VALIDAÇÃO DE CPF ==========
    async validateCPF(cpfNumeros) {
        const cpfMessage = document.getElementById('cpfMessage');
        const nextBtn = document.getElementById('section1-next');
        
        // Verifica se o database está disponível
        if (!window.clienteDatabase) {
            cpfMessage.textContent = 'Sistema temporariamente indisponível. Tente novamente.';
            cpfMessage.className = 'cpf-message error';
            nextBtn.disabled = true;
            return;
        }

        try {
            // CPF completo, verificar no banco
            const cpfExists = await window.clienteDatabase.checkCPFExists(cpfNumeros);
            
            if (cpfExists) {
                cpfMessage.innerHTML = 'Oi! Este CPF já foi cadastrado!, <a href="https://marcosoliveiramaster.github.io/Master-AgendamentoAulas/" target="_blank">clique aqui para iniciarmos a contratação das suas aulas, tudo bem?</a>';
                cpfMessage.className = 'cpf-message error';
                nextBtn.disabled = true;
            } else {
                cpfMessage.textContent = 'CPF válido';
                cpfMessage.className = 'cpf-message success';
                nextBtn.disabled = false;
            }
        } catch (error) {
            console.error('Erro na validação de CPF:', error);
            cpfMessage.textContent = 'Erro ao validar CPF. Tente novamente.';
            cpfMessage.className = 'cpf-message error';
            nextBtn.disabled = true;
        }
    }

    clearCPFMessage() {
        const cpfMessage = document.getElementById('cpfMessage');
        const nextBtn = document.getElementById('section1-next');
        
        cpfMessage.textContent = '';
        nextBtn.disabled = true;
    }

    setupCPFValidation() {
        console.log('✅ Validação de CPF configurada');
    }

    // ========== BUSCA DE CEP ==========
    async buscarCEP(cepNumeros) {
        try {
            const cepClean = String(cepNumeros).replace(/\D/g, '');
            if (cepClean.length !== 8) return;

            const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cepClean}`);
            if (!response.ok) throw new Error('CEP não encontrado');

            const data = await response.json();
            const enderecoFormatado = `${data.street}, ${data.neighborhood}`;
            const cidadeUF = `${data.city} - ${data.state}`;

            const enderecoField = document.getElementById('endereco');
            const cidadeUFField = document.getElementById('cidade-uf');
            
            if (enderecoField) {
                enderecoField.value = enderecoFormatado;
                // Dispara evento para animação do label
                enderecoField.dispatchEvent(new Event('input'));
            }
            
            if (cidadeUFField) {
                cidadeUFField.value = cidadeUF;
                // Dispara evento para animação do label
                cidadeUFField.dispatchEvent(new Event('input'));
            }

            console.log('✅ Endereço encontrado via BrasilAPI:', enderecoFormatado, cidadeUF);
            this.validateSection2();
        } catch (error) {
            console.error('❌ Erro ao buscar CEP:', error);
            alert('CEP não encontrado. Verifique o CEP digitado.');
        }
    }

    // ========== VALIDAÇÃO SEÇÃO 2 ==========
    validateSection2() {
        const nextBtn = document.getElementById('section2-next');
        if (!nextBtn) return;

        const nomeField = document.getElementById('nome');
        const emailField = document.getElementById('email');
        const contatoField = document.getElementById('contato');
        const cepField = document.getElementById('cep');
        const enderecoField = document.getElementById('endereco');
        const cidadeUFField = document.getElementById('cidade-uf');

        const nomeValid = nomeField && nomeField.value.trim() !== '';
        const emailValid = emailField && emailField.value.trim() !== '' && emailField.checkValidity();
        const contatoValid = contatoField && contatoField.value.replace(/\D/g, '').length >= 10;
        const cepValid = cepField && cepField.value.replace(/\D/g, '').length === 8;
        const enderecoValid = enderecoField && enderecoField.value.trim() !== '';
        const cidadeUFValid = cidadeUFField && cidadeUFField.value.trim() !== '';

        nextBtn.disabled = !(nomeValid && emailValid && contatoValid && cepValid && enderecoValid && cidadeUFValid);
    }

    // ========== SEÇÃO DOS ESTUDANTES ==========
    setupEstudantesSection() {
        const quantidadeSelect = document.getElementById('quantidadeEstudantes');
        if (quantidadeSelect) {
            quantidadeSelect.addEventListener('change', (e) => {
                this.updateEstudantesFields(parseInt(e.target.value));
            });
            
            // Inicializa com 1 estudante
            this.updateEstudantesFields(1);
        }
    }

    updateEstudantesFields(quantidade) {
        const container = document.getElementById('estudantesContainer');
        if (!container) return;

        container.innerHTML = '';
        this.estudantesData = [];

        const template = document.getElementById('estudanteTemplate');
        if (!template) return;

        for (let i = 1; i <= quantidade; i++) {
            const clone = template.content.cloneNode(true);
            const estudanteGroup = clone.querySelector('.estudante-group');
            
            // Atualiza o número do estudante
            const numeroSpan = estudanteGroup.querySelector('.estudante-numero');
            if (numeroSpan) {
                numeroSpan.textContent = i;
            }
            
            // Atualiza o índice de dados
            estudanteGroup.setAttribute('data-estudante-index', i);
            
            // Configura máscara de data para aniversário
            const aniversarioField = estudanteGroup.querySelector('.estudante-aniversario');
            if (aniversarioField) {
                this.setupMaskData(aniversarioField);
            }
            
            // Configura eventos para necessidades especiais
            this.setupNecessidadesEspeciais(estudanteGroup, i);
            
            // Configura eventos para atualização de dados
            this.setupEstudanteEvents(estudanteGroup, i);
            
            container.appendChild(estudanteGroup);
            
            // Inicializa dados do estudante COM AS NOVAS VARIÁVEIS
            this.estudantesData[i-1] = {
                nome: '',
                escola: '',
                aniversario: '',
                serie: '',
                atendimentoEspecializado: false,
                necessidades: [],
                outraNecessidade: '',
                possuiLaudo: false,
                atipicidade: '',
                LinkGoogleMaps: '', // NOVA VARIÁVEL
                LinkLaudo: ''       // NOVA VARIÁVEL (será LinkLaudoAluno_X no banco)
            };
        }
    }

    setupMaskData(field) {
        field.addEventListener('input', e => {
            let value = e.target.value.replace(/\D/g, '');
            
            // Aplica máscara DD/MM/AAAA
            if (value.length > 2) {
                value = value.substring(0, 2) + '/' + value.substring(2);
            }
            if (value.length > 5) {
                value = value.substring(0, 5) + '/' + value.substring(5, 9);
            }
            
            e.target.value = value;
        });
    }

    setupEstudanteEvents(estudanteGroup, index) {
        // Configura eventos para campos de texto
        const textFields = estudanteGroup.querySelectorAll('.estudante-nome, .estudante-escola, .estudante-aniversario, .necessidade-outra');
        textFields.forEach(field => {
            field.addEventListener('input', () => {
                this.updateEstudanteData(field, index);
            });
        });

        // Configura evento específico para o select da série - CORREÇÃO DO PROBLEMA
        const serieSelect = estudanteGroup.querySelector('.estudante-serie');
        if (serieSelect) {
            serieSelect.addEventListener('change', (e) => {
                this.updateEstudanteSelectData(e.target, index);
            });
            
            // Também adiciona evento de input para garantir captura
            serieSelect.addEventListener('input', (e) => {
                this.updateEstudanteSelectData(e.target, index);
            });
        }
    }

    // NOVO MÉTODO PARA LIDAR COM SELECTS
    updateEstudanteSelectData(selectElement, estudanteIndex) {
        const index = estudanteIndex - 1;
        const fieldType = selectElement.className.split(' ')[2]; // Pega a terceira classe (estudante-serie)
        
        if (fieldType === 'estudante-serie') {
            this.estudantesData[index].serie = selectElement.value;
            console.log(`Série do estudante ${estudanteIndex} atualizada para:`, selectElement.value);
        }
    }

    setupNecessidadesEspeciais(estudanteGroup, index) {
        const atendimentoCheckbox = estudanteGroup.querySelector('.estudante-atendimento-especializado');
        const necessidadesDiv = estudanteGroup.querySelector('.necessidades-especiais');
        const necessidadeItems = estudanteGroup.querySelectorAll('.necessidade-item');
        const outraNecessidadeField = estudanteGroup.querySelector('.necessidade-outra');
        const laudoCheckbox = estudanteGroup.querySelector('.estudante-laudo');
        
        // Mostra/oculta seção de necessidades
        if (atendimentoCheckbox && necessidadesDiv) {
            atendimentoCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                necessidadesDiv.classList.toggle('hidden', !isChecked);
                
                // Atualiza dados
                this.estudantesData[index-1].atendimentoEspecializado = isChecked;
                if (!isChecked) {
                    this.estudantesData[index-1].necessidades = [];
                    this.estudantesData[index-1].outraNecessidade = '';
                    this.estudantesData[index-1].possuiLaudo = false;
                    this.estudantesData[index-1].atipicidade = '';
                    
                    // Limpa seleções visuais
                    necessidadeItems.forEach(item => {
                        item.classList.remove('selected');
                    });
                    if (outraNecessidadeField) outraNecessidadeField.value = '';
                    if (laudoCheckbox) laudoCheckbox.checked = false;
                }
            });
        }
        
        // Configura seleção de necessidades
        necessidadeItems.forEach(item => {
            item.addEventListener('click', () => {
                item.classList.toggle('selected');
                const value = item.getAttribute('data-value');
                this.toggleNecessidade(index, value);
            });
        });
        
        // Configura campo de outra necessidade
        if (outraNecessidadeField) {
            outraNecessidadeField.addEventListener('input', (e) => {
                this.estudantesData[index-1].outraNecessidade = e.target.value.trim();
                this.updateAtipicidade(index);
            });
        }
        
        // Configura checkbox do laudo
        if (laudoCheckbox) {
            laudoCheckbox.addEventListener('change', (e) => {
                this.estudantesData[index-1].possuiLaudo = e.target.checked;
            });
        }
    }

    toggleNecessidade(estudanteIndex, necessidade) {
        const index = estudanteIndex - 1;
        const currentNecessidades = this.estudantesData[index].necessidades;
        const necessidadeIndex = currentNecessidades.indexOf(necessidade);
        
        if (necessidadeIndex === -1) {
            // Adiciona
            currentNecessidades.push(necessidade);
        } else {
            // Remove
            currentNecessidades.splice(necessidadeIndex, 1);
        }
        
        this.estudantesData[index].necessidades = currentNecessidades;
        this.updateAtipicidade(estudanteIndex);
    }

    updateAtipicidade(estudanteIndex) {
        const index = estudanteIndex - 1;
        const estudante = this.estudantesData[index];
        
        if (estudante.atendimentoEspecializado) {
            // Cria uma cópia das necessidades selecionadas nos botões
            const todasNecessidades = [...estudante.necessidades];
            
            // Se houver texto em "outra necessidade", adiciona à lista
            if (estudante.outraNecessidade && estudante.outraNecessidade.trim() !== '') {
                todasNecessidades.push(estudante.outraNecessidade.trim());
            }
            
            // Junta tudo em uma string
            estudante.atipicidade = todasNecessidades.join(', ');
        } else {
            estudante.atipicidade = '';
        }
    }

    updateEstudanteData(field, estudanteIndex) {
        const index = estudanteIndex - 1;
        const fieldType = field.className.split(' ')[1]; // Pega a segunda classe
        
        switch (fieldType) {
            case 'estudante-nome':
                this.estudantesData[index].nome = field.value.trim();
                break;
            case 'estudante-escola':
                this.estudantesData[index].escola = field.value.trim();
                break;
            case 'estudante-aniversario':
                this.estudantesData[index].aniversario = field.value.trim();
                break;
            case 'necessidade-outra':
                this.estudantesData[index].outraNecessidade = field.value.trim();
                this.updateAtipicidade(estudanteIndex);
                break;
        }
    }

    // ========== SEÇÃO DE AJUSTES FINAIS ==========
    setupAjustesFinaisSection() {
        this.setupMesmoEndereco();
        this.setupConfirmaNF();
    }

    setupMesmoEndereco() {
        const mesmoEnderecoSelect = document.getElementById('mesmoEndereco');
        const enderecoAulasSection = document.getElementById('enderecoAulasSection');

        if (mesmoEnderecoSelect && enderecoAulasSection) {
            mesmoEnderecoSelect.addEventListener('change', (e) => {
                const isMesmoEndereco = e.target.value === 'sim';
                this.ajustesFinaisData.mesmoEndereco = isMesmoEndereco;
                
                enderecoAulasSection.classList.toggle('hidden', isMesmoEndereco);

                // Se for o mesmo endereço, copia os dados do endereço do contratante
                if (isMesmoEndereco) {
                    this.copiarEnderecoContratanteParaAulas();
                }
            });

            // Configurar máscara para CEP das aulas
            const cepAulasField = document.getElementById('cepAulas');
            if (cepAulasField) {
                this.setupMaskCEPAulas(cepAulasField);
            }

            // Configurar eventos para campos do endereço das aulas
            this.setupEnderecoAulasEvents();
        }
    }

    setupMaskCEPAulas(cepField) {
        const tryBuscar = (val) => {
            const numeric = (val || '').replace(/\D/g, '');
            if (numeric.length === 8) {
                const formatted = numeric.replace(/(\d{5})(\d)/, '$1-$2');
                cepField.value = formatted;
                this.buscarCEPAulas(numeric);
            }
        };

        cepField.addEventListener('input', e => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 8) value = value.slice(0, 8);
            if (value.length > 5) {
                value = value.replace(/(\d{5})(\d)/, '$1-$2');
            }
            e.target.value = value;

            if (value.replace(/\D/g, '').length === 8) {
                this.buscarCEPAulas(value.replace(/\D/g, ''));
            }
        });

        cepField.addEventListener('paste', (ev) => {
            setTimeout(() => tryBuscar(cepField.value), 50);
        });

        cepField.addEventListener('blur', (ev) => {
            tryBuscar(ev.target.value);
        });
    }

    async buscarCEPAulas(cepNumeros) {
        try {
            const cepClean = String(cepNumeros).replace(/\D/g, '');
            if (cepClean.length !== 8) return;

            const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cepClean}`);
            if (!response.ok) throw new Error('CEP não encontrado');

            const data = await response.json();
            const enderecoFormatado = `${data.street}, ${data.neighborhood}`;
            const cidadeUF = `${data.city} - ${data.state}`;

            const enderecoAulasField = document.getElementById('enderecoAulas');
            const cidadeUFAulasField = document.getElementById('cidadeUFAulas');
            
            if (enderecoAulasField) {
                enderecoAulasField.value = enderecoFormatado;
                this.ajustesFinaisData.enderecoAulas = enderecoFormatado;
                enderecoAulasField.dispatchEvent(new Event('input'));
            }
            
            if (cidadeUFAulasField) {
                cidadeUFAulasField.value = cidadeUF;
                this.ajustesFinaisData.cidadeUFAulas = cidadeUF;
                cidadeUFAulasField.dispatchEvent(new Event('input'));
            }

            console.log('✅ Endereço das aulas encontrado via BrasilAPI:', enderecoFormatado, cidadeUF);
        } catch (error) {
            console.error('❌ Erro ao buscar CEP das aulas:', error);
            alert('CEP não encontrado. Verifique o CEP digitado.');
        }
    }

    setupEnderecoAulasEvents() {
        const camposEnderecoAulas = ['enderecoAulas', 'cidadeUFAulas', 'complementoAulas'];
        
        camposEnderecoAulas.forEach(campo => {
            const element = document.getElementById(campo);
            if (element) {
                element.addEventListener('input', (e) => {
                    this.ajustesFinaisData[campo] = e.target.value.trim();
                });
            }
        });
    }

    copiarEnderecoContratanteParaAulas() {
        const cepContratante = document.getElementById('cep').value;
        const enderecoContratante = document.getElementById('endereco').value;
        const cidadeUFContratante = document.getElementById('cidade-uf').value;
        const complementoContratante = document.getElementById('complemento').value;

        // Atualiza dados
        this.ajustesFinaisData.cepAulas = cepContratante;
        this.ajustesFinaisData.enderecoAulas = enderecoContratante;
        this.ajustesFinaisData.cidadeUFAulas = cidadeUFContratante;
        this.ajustesFinaisData.complementoAulas = complementoContratante;

        // Atualiza campos visuais (se a seção estiver visível)
        if (!document.getElementById('enderecoAulasSection').classList.contains('hidden')) {
            document.getElementById('cepAulas').value = cepContratante;
            document.getElementById('enderecoAulas').value = enderecoContratante;
            document.getElementById('cidadeUFAulas').value = cidadeUFContratante;
            document.getElementById('complementoAulas').value = complementoContratante;

            // Disparar eventos para atualizar as animações dos labels
            document.getElementById('cepAulas').dispatchEvent(new Event('input'));
            document.getElementById('enderecoAulas').dispatchEvent(new Event('input'));
            document.getElementById('cidadeUFAulas').dispatchEvent(new Event('input'));
            document.getElementById('complementoAulas').dispatchEvent(new Event('input'));
        }
    }

    setupConfirmaNF() {
        const confirmaNFSelect = document.getElementById('confirmaNF');
        const dadosNFSection = document.getElementById('dadosNFSection');

        if (confirmaNFSelect && dadosNFSection) {
            confirmaNFSelect.addEventListener('change', (e) => {
                const confirma = e.target.value === 'sim';
                this.ajustesFinaisData.confirmaNF = confirma;
                
                dadosNFSection.classList.toggle('hidden', confirma);

                // Se confirmar, copia os dados do contratante para a NF
                if (confirma) {
                    this.copiarDadosContratanteParaNF();
                } else {
                    // Se não confirmar, preenche com os dados atuais para edição
                    this.preencherDadosNFAtuais();
                }
            });

            // Configurar máscara para CPF da NF
            const nfCpfField = document.getElementById('nfCpf');
            if (nfCpfField) {
                this.setupMaskCpfNF(nfCpfField);
            }

            // Configurar eventos para campos editáveis da NF
            this.setupCamposNFEvents();
        }
    }

    setupMaskCpfNF(cpfField) {
        cpfField.addEventListener('input', e => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            
            e.target.value = value;
            this.ajustesFinaisData.nfCpf = value.replace(/\D/g, '');
        });
    }

    setupCamposNFEvents() {
        const camposNF = ['nfNome', 'nfEndereco', 'nfCpf', 'nfEmail'];
        
        camposNF.forEach(campo => {
            const element = document.getElementById(campo);
            if (element) {
                element.addEventListener('input', (e) => {
                    this.ajustesFinaisData[campo] = e.target.value.trim();
                });
            }
        });
    }

    copiarDadosContratanteParaNF() {
        const nomeContratante = document.getElementById('nome').value;
        const enderecoContratante = document.getElementById('endereco').value;
        const cpfContratante = document.getElementById('cpf').value;
        const emailContratante = document.getElementById('email').value;

        // Atualiza dados
        this.ajustesFinaisData.nfNome = nomeContratante;
        this.ajustesFinaisData.nfEndereco = enderecoContratante;
        this.ajustesFinaisData.nfCpf = cpfContratante.replace(/\D/g, '');
        this.ajustesFinaisData.nfEmail = emailContratante;

        // Atualiza campos visuais (se a seção estiver visível)
        if (!document.getElementById('dadosNFSection').classList.contains('hidden')) {
            document.getElementById('nfNome').value = nomeContratante;
            document.getElementById('nfEndereco').value = enderecoContratante;
            document.getElementById('nfCpf').value = cpfContratante;
            document.getElementById('nfEmail').value = emailContratante;

            // Disparar eventos para atualizar as animações dos labels
            document.getElementById('nfNome').dispatchEvent(new Event('input'));
            document.getElementById('nfEndereco').dispatchEvent(new Event('input'));
            document.getElementById('nfCpf').dispatchEvent(new Event('input'));
            document.getElementById('nfEmail').dispatchEvent(new Event('input'));
        }
    }

    preencherDadosNFAtuais() {
        // Preenche com os dados atuais do formulário para edição
        const nomeContratante = document.getElementById('nome').value;
        const enderecoContratante = document.getElementById('endereco').value;
        const cpfContratante = document.getElementById('cpf').value;
        const emailContratante = document.getElementById('email').value;

        document.getElementById('nfNome').value = nomeContratante;
        document.getElementById('nfEndereco').value = enderecoContratante;
        document.getElementById('nfCpf').value = cpfContratante;
        document.getElementById('nfEmail').value = emailContratante;

        // Disparar eventos para atualizar as animações dos labels
        document.getElementById('nfNome').dispatchEvent(new Event('input'));
        document.getElementById('nfEndereco').dispatchEvent(new Event('input'));
        document.getElementById('nfCpf').dispatchEvent(new Event('input'));
        document.getElementById('nfEmail').dispatchEvent(new Event('input'));
    }

    // ========== NAVEGAÇÃO ENTRE SEÇÕES ==========
    showSection(sectionNumber) {
        document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.progress-step').forEach(step => step.classList.remove('active'));
        
        const sectionEl = document.getElementById(`section${sectionNumber}`);
        if (sectionEl) sectionEl.classList.add('active');
        
        // Atualiza progresso
        for (let i = 1; i <= Math.min(sectionNumber, 4); i++) {
            const progressStep = document.querySelector(`.progress-step:nth-child(${i})`);
            if (progressStep) progressStep.classList.add('active');
        }
        
        this.currentSection = sectionNumber;
        console.log(`📄 Navegou para seção ${sectionNumber}`);
    }

    // ========== CONFIGURAÇÃO DE EVENTOS ==========
    setupEventListeners() {
        // Navegação seção 1
        const section1NextBtn = document.getElementById('section1-next');
        if (section1NextBtn) {
            section1NextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (section1NextBtn.disabled) return;
                this.showSection(2);
            });
        }

        // Validação em tempo real dos campos da seção 2
        const section2Fields = ['nome', 'email', 'contato', 'cep', 'endereco', 'cidade-uf'];
        section2Fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.addEventListener('input', () => this.validateSection2());
            }
        });

        // Atualizar navegação da seção 3 para ir para seção 4
        const section3SubmitBtn = document.querySelector('#section3 .btn-next');
        if (section3SubmitBtn) {
            section3SubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(4);
            });
        }

        // Configuração do envio do formulário (agora na seção 4)
        const form = document.getElementById('formularioCliente');
        if (form) {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                
                // Verifica se o database está disponível
                if (!window.clienteDatabase) {
                    alert('Sistema temporariamente indisponível. Tente novamente em alguns instantes.');
                    return;
                }
                
                // Prepara dados dos estudantes e ajustes finais
                window.clienteDatabase.estudantesData = this.estudantesData;
                window.clienteDatabase.ajustesFinaisData = this.ajustesFinaisData;
                
                await window.clienteDatabase.handleFormSubmit();
            });
        }

        console.log('✅ Event listeners configurados');
    }
}

// ========== INICIALIZAÇÃO DA APLICAÇÃO ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando aplicação de animações...');
    window.clienteAnimacoes = new ClienteAnimacoes();
});

// ========== FUNÇÕES GLOBAIS PARA HTML ==========
function showSection(sectionNumber) {
    if (window.clienteAnimacoes) {
        window.clienteAnimacoes.showSection(sectionNumber);
    }
}