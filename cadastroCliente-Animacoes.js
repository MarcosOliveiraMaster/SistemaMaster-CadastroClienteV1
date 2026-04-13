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
        document.addEventListener('DOMContentLoaded', () => {
            const inputs = document.querySelectorAll('.input-field');
            inputs.forEach(input => {
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

        cepField.addEventListener('paste', () => {
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

        if (!window.clienteDatabase) {
            cpfMessage.textContent = 'Sistema temporariamente indisponível. Tente novamente.';
            cpfMessage.className = 'cpf-message error';
            nextBtn.disabled = true;
            return;
        }

        try {
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
        const enderecoField = document.getElementById('endereco');
        const cidadeUFField = document.getElementById('cidade-uf');

        try {
            const cepClean = String(cepNumeros).replace(/\D/g, '');
            if (cepClean.length !== 8) return;

            const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cepClean}`);
            if (!response.ok) throw new Error('CEP não encontrado');

            const data = await response.json();
            const rua    = data.street       || '';
            const bairro = data.neighborhood || '';
            const enderecoFormatado = [rua, bairro].filter(Boolean).join(', ');
            const cidadeUF = `${data.city} - ${data.state}`;

            if (enderecoField) {
                enderecoField.value    = enderecoFormatado;
                enderecoField.readOnly = false; // Editável: usuário pode adicionar número
                enderecoField.dispatchEvent(new Event('input'));
            }
            if (cidadeUFField) {
                cidadeUFField.value    = cidadeUF;
                cidadeUFField.readOnly = true;
                cidadeUFField.dispatchEvent(new Event('input'));
            }

            this.setCepStatusMessage('');
            this.validateSection2();
            console.log('✅ Endereço encontrado via BrasilAPI:', enderecoFormatado, cidadeUF);

        } catch (error) {
            console.error('❌ Erro ao buscar CEP:', error);
            // Sem alert — libera campos para preenchimento manual
            if (enderecoField) {
                enderecoField.value       = '';
                enderecoField.readOnly    = false;
                enderecoField.placeholder = 'Digite o endereço manualmente';
            }
            if (cidadeUFField) {
                cidadeUFField.value       = '';
                cidadeUFField.readOnly    = false; // Libera para digitação manual
                cidadeUFField.placeholder = 'Cidade - UF (ex: Maceió - AL)';
            }
            this.setCepStatusMessage('CEP não encontrado. Preencha o endereço manualmente.');
            this.validateSection2();
        }
    }

    // Exibe mensagem inline abaixo do campo CEP (sem bloquear o formulário)
    setCepStatusMessage(message) {
        let msgEl = document.getElementById('cepStatusMessage');
        if (!msgEl) {
            msgEl = document.createElement('span');
            msgEl.id        = 'cepStatusMessage';
            msgEl.className = 'cpf-message';
            const cepGroup = document.getElementById('cep')?.closest('.input-group');
            if (cepGroup) cepGroup.appendChild(msgEl);
        }
        msgEl.textContent   = message;
        msgEl.className     = message ? 'cpf-message error' : 'cpf-message';
        msgEl.style.display = message ? 'block' : 'none';
    }

    // ========== VALIDAÇÃO SEÇÃO 2 ==========
    validateSection2() {
        const nextBtn = document.getElementById('section2-next');
        if (!nextBtn) return;

        const nomeField    = document.getElementById('nome');
        const emailField   = document.getElementById('email');
        const contatoField = document.getElementById('contato');
        const cepField     = document.getElementById('cep');
        const enderecoField = document.getElementById('endereco');
        const cidadeUFField = document.getElementById('cidade-uf');

        const nomeValid     = nomeField    && nomeField.value.trim() !== '';
        const emailValid    = emailField   && emailField.value.trim() !== '' && emailField.checkValidity();
        const contatoValid  = contatoField && contatoField.value.replace(/\D/g, '').length >= 10;
        const cepValid      = cepField     && cepField.value.replace(/\D/g, '').length === 8;
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

            const numeroSpan = estudanteGroup.querySelector('.estudante-numero');
            if (numeroSpan) numeroSpan.textContent = i;

            estudanteGroup.setAttribute('data-estudante-index', i);

            const aniversarioField = estudanteGroup.querySelector('.estudante-aniversario');
            if (aniversarioField) this.setupMaskData(aniversarioField);

            this.setupNecessidadesEspeciais(estudanteGroup, i);
            this.setupEstudanteEvents(estudanteGroup, i);

            container.appendChild(estudanteGroup);

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
                LinkGoogleMaps: '',
                LinkLaudo: ''
            };
        }
    }

    setupMaskData(field) {
        field.addEventListener('input', e => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 2) value = value.substring(0, 2) + '/' + value.substring(2);
            if (value.length > 5) value = value.substring(0, 5) + '/' + value.substring(5, 9);
            e.target.value = value;
        });
    }

    setupEstudanteEvents(estudanteGroup, index) {
        const textFields = estudanteGroup.querySelectorAll('.estudante-nome, .estudante-escola, .estudante-aniversario, .necessidade-outra');
        textFields.forEach(field => {
            field.addEventListener('input', () => {
                this.updateEstudanteData(field, index);
            });
        });

        const serieSelect = estudanteGroup.querySelector('.estudante-serie');
        if (serieSelect) {
            serieSelect.addEventListener('change', (e) => {
                this.updateEstudanteSelectData(e.target, index);
            });
            serieSelect.addEventListener('input', (e) => {
                this.updateEstudanteSelectData(e.target, index);
            });
        }
    }

    updateEstudanteSelectData(selectElement, estudanteIndex) {
        const index = estudanteIndex - 1;
        const fieldType = selectElement.className.split(' ')[2];
        if (fieldType === 'estudante-serie') {
            this.estudantesData[index].serie = selectElement.value;
        }
    }

    setupNecessidadesEspeciais(estudanteGroup, index) {
        const atendimentoCheckbox  = estudanteGroup.querySelector('.estudante-atendimento-especializado');
        const necessidadesDiv      = estudanteGroup.querySelector('.necessidades-especiais');
        const necessidadeItems     = estudanteGroup.querySelectorAll('.necessidade-item');
        const outraNecessidadeField = estudanteGroup.querySelector('.necessidade-outra');
        const laudoCheckbox        = estudanteGroup.querySelector('.estudante-laudo');

        if (atendimentoCheckbox && necessidadesDiv) {
            atendimentoCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                necessidadesDiv.classList.toggle('hidden', !isChecked);
                this.estudantesData[index-1].atendimentoEspecializado = isChecked;
                if (!isChecked) {
                    this.estudantesData[index-1].necessidades    = [];
                    this.estudantesData[index-1].outraNecessidade = '';
                    this.estudantesData[index-1].possuiLaudo     = false;
                    this.estudantesData[index-1].atipicidade     = '';
                    necessidadeItems.forEach(item => item.classList.remove('selected'));
                    if (outraNecessidadeField) outraNecessidadeField.value = '';
                    if (laudoCheckbox) laudoCheckbox.checked = false;
                }
            });
        }

        necessidadeItems.forEach(item => {
            item.addEventListener('click', () => {
                item.classList.toggle('selected');
                const value = item.getAttribute('data-value');
                this.toggleNecessidade(index, value);
            });
        });

        if (outraNecessidadeField) {
            outraNecessidadeField.addEventListener('input', (e) => {
                this.estudantesData[index-1].outraNecessidade = e.target.value.trim();
                this.updateAtipicidade(index);
            });
        }

        if (laudoCheckbox) {
            laudoCheckbox.addEventListener('change', (e) => {
                this.estudantesData[index-1].possuiLaudo = e.target.checked;
            });
        }
    }

    toggleNecessidade(estudanteIndex, necessidade) {
        const index = estudanteIndex - 1;
        const current = this.estudantesData[index].necessidades;
        const pos = current.indexOf(necessidade);
        if (pos === -1) current.push(necessidade);
        else current.splice(pos, 1);
        this.estudantesData[index].necessidades = current;
        this.updateAtipicidade(estudanteIndex);
    }

    updateAtipicidade(estudanteIndex) {
        const index    = estudanteIndex - 1;
        const estudante = this.estudantesData[index];
        if (estudante.atendimentoEspecializado) {
            const todas = [...estudante.necessidades];
            if (estudante.outraNecessidade && estudante.outraNecessidade.trim() !== '') {
                todas.push(estudante.outraNecessidade.trim());
            }
            estudante.atipicidade = todas.join(', ');
        } else {
            estudante.atipicidade = '';
        }
    }

    updateEstudanteData(field, estudanteIndex) {
        const index     = estudanteIndex - 1;
        const fieldType = field.className.split(' ')[1];
        switch (fieldType) {
            case 'estudante-nome':        this.estudantesData[index].nome             = field.value.trim(); break;
            case 'estudante-escola':      this.estudantesData[index].escola           = field.value.trim(); break;
            case 'estudante-aniversario': this.estudantesData[index].aniversario      = field.value.trim(); break;
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
        const mesmoEnderecoSelect   = document.getElementById('mesmoEndereco');
        const enderecoAulasSection  = document.getElementById('enderecoAulasSection');

        if (mesmoEnderecoSelect && enderecoAulasSection) {
            mesmoEnderecoSelect.addEventListener('change', (e) => {
                const isMesmoEndereco = e.target.value === 'sim';
                this.ajustesFinaisData.mesmoEndereco = isMesmoEndereco;
                enderecoAulasSection.classList.toggle('hidden', isMesmoEndereco);
                if (isMesmoEndereco) this.copiarEnderecoContratanteParaAulas();
            });

            const cepAulasField = document.getElementById('cepAulas');
            if (cepAulasField) this.setupMaskCEPAulas(cepAulasField);

            this.setupEnderecoAulasEvents();
        }
    }

    setupMaskCEPAulas(cepField) {
        const tryBuscar = (val) => {
            const numeric = (val || '').replace(/\D/g, '');
            if (numeric.length === 8) {
                cepField.value = numeric.replace(/(\d{5})(\d)/, '$1-$2');
                this.buscarCEPAulas(numeric);
            }
        };

        cepField.addEventListener('input', e => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 8) value = value.slice(0, 8);
            if (value.length > 5) value = value.replace(/(\d{5})(\d)/, '$1-$2');
            e.target.value = value;
            if (value.replace(/\D/g, '').length === 8) this.buscarCEPAulas(value.replace(/\D/g, ''));
        });

        cepField.addEventListener('paste', () => setTimeout(() => tryBuscar(cepField.value), 50));
        cepField.addEventListener('blur',  (ev) => tryBuscar(ev.target.value));
    }

    async buscarCEPAulas(cepNumeros) {
        const enderecoAulasField = document.getElementById('enderecoAulas');
        const cidadeUFAulasField = document.getElementById('cidadeUFAulas');

        try {
            const cepClean = String(cepNumeros).replace(/\D/g, '');
            if (cepClean.length !== 8) return;

            const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cepClean}`);
            if (!response.ok) throw new Error('CEP não encontrado');

            const data   = await response.json();
            const rua    = data.street       || '';
            const bairro = data.neighborhood || '';
            const enderecoFormatado = [rua, bairro].filter(Boolean).join(', ');
            const cidadeUF = `${data.city} - ${data.state}`;

            if (enderecoAulasField) {
                enderecoAulasField.value    = enderecoFormatado;
                enderecoAulasField.readOnly = false;
                this.ajustesFinaisData.enderecoAulas = enderecoFormatado;
                enderecoAulasField.dispatchEvent(new Event('input'));
            }
            if (cidadeUFAulasField) {
                cidadeUFAulasField.value    = cidadeUF;
                cidadeUFAulasField.readOnly = true;
                this.ajustesFinaisData.cidadeUFAulas = cidadeUF;
                cidadeUFAulasField.dispatchEvent(new Event('input'));
            }
            this.setCepAulasStatusMessage('');
            console.log('✅ Endereço das aulas encontrado via BrasilAPI:', enderecoFormatado, cidadeUF);

        } catch (error) {
            console.error('❌ Erro ao buscar CEP das aulas:', error);
            // Sem alert — libera campos para preenchimento manual
            if (enderecoAulasField) {
                enderecoAulasField.value       = '';
                enderecoAulasField.readOnly    = false;
                enderecoAulasField.placeholder = 'Digite o endereço manualmente';
                this.ajustesFinaisData.enderecoAulas = '';
            }
            if (cidadeUFAulasField) {
                cidadeUFAulasField.value       = '';
                cidadeUFAulasField.readOnly    = false; // Libera para digitação manual
                cidadeUFAulasField.placeholder = 'Cidade - UF (ex: Maceió - AL)';
                this.ajustesFinaisData.cidadeUFAulas = '';
            }
            this.setCepAulasStatusMessage('CEP não encontrado. Preencha o endereço manualmente.');
        }
    }

    // Exibe mensagem inline abaixo do campo CEP das aulas
    setCepAulasStatusMessage(message) {
        let msgEl = document.getElementById('cepAulasStatusMessage');
        if (!msgEl) {
            msgEl = document.createElement('span');
            msgEl.id        = 'cepAulasStatusMessage';
            msgEl.className = 'cpf-message';
            const cepGroup = document.getElementById('cepAulas')?.closest('.input-group');
            if (cepGroup) cepGroup.appendChild(msgEl);
        }
        msgEl.textContent   = message;
        msgEl.className     = message ? 'cpf-message error' : 'cpf-message';
        msgEl.style.display = message ? 'block' : 'none';
    }

    setupEnderecoAulasEvents() {
        ['enderecoAulas', 'cidadeUFAulas', 'complementoAulas'].forEach(campo => {
            const element = document.getElementById(campo);
            if (element) {
                element.addEventListener('input', (e) => {
                    this.ajustesFinaisData[campo] = e.target.value.trim();
                });
            }
        });
    }

    copiarEnderecoContratanteParaAulas() {
        const cepContratante        = document.getElementById('cep').value;
        const enderecoContratante   = document.getElementById('endereco').value;
        const cidadeUFContratante   = document.getElementById('cidade-uf').value;
        const complementoContratante = document.getElementById('complemento').value;

        this.ajustesFinaisData.cepAulas         = cepContratante;
        this.ajustesFinaisData.enderecoAulas    = enderecoContratante;
        this.ajustesFinaisData.cidadeUFAulas    = cidadeUFContratante;
        this.ajustesFinaisData.complementoAulas = complementoContratante;

        const section = document.getElementById('enderecoAulasSection');
        if (section && !section.classList.contains('hidden')) {
            document.getElementById('cepAulas').value         = cepContratante;
            document.getElementById('enderecoAulas').value   = enderecoContratante;
            document.getElementById('cidadeUFAulas').value   = cidadeUFContratante;
            document.getElementById('complementoAulas').value = complementoContratante;

            ['cepAulas','enderecoAulas','cidadeUFAulas','complementoAulas'].forEach(id => {
                document.getElementById(id)?.dispatchEvent(new Event('input'));
            });
        }
    }

    setupConfirmaNF() {
        const confirmaNFSelect = document.getElementById('confirmaNF');
        const dadosNFSection   = document.getElementById('dadosNFSection');

        if (confirmaNFSelect && dadosNFSection) {
            confirmaNFSelect.addEventListener('change', (e) => {
                const confirma = e.target.value === 'sim';
                this.ajustesFinaisData.confirmaNF = confirma;
                dadosNFSection.classList.toggle('hidden', confirma);
                if (confirma) this.copiarDadosContratanteParaNF();
                else          this.preencherDadosNFAtuais();
            });

            const nfCpfField = document.getElementById('nfCpf');
            if (nfCpfField) this.setupMaskCpfNF(nfCpfField);

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
        ['nfNome', 'nfEndereco', 'nfCpf', 'nfEmail'].forEach(campo => {
            const element = document.getElementById(campo);
            if (element) {
                element.addEventListener('input', (e) => {
                    this.ajustesFinaisData[campo] = e.target.value.trim();
                });
            }
        });
    }

    copiarDadosContratanteParaNF() {
        const nome      = document.getElementById('nome').value;
        const endereco  = document.getElementById('endereco').value;
        const cpf       = document.getElementById('cpf').value;
        const email     = document.getElementById('email').value;

        this.ajustesFinaisData.nfNome     = nome;
        this.ajustesFinaisData.nfEndereco = endereco;
        this.ajustesFinaisData.nfCpf      = cpf.replace(/\D/g, '');
        this.ajustesFinaisData.nfEmail    = email;

        if (!document.getElementById('dadosNFSection').classList.contains('hidden')) {
            document.getElementById('nfNome').value     = nome;
            document.getElementById('nfEndereco').value = endereco;
            document.getElementById('nfCpf').value      = cpf;
            document.getElementById('nfEmail').value    = email;
            ['nfNome','nfEndereco','nfCpf','nfEmail'].forEach(id => {
                document.getElementById(id)?.dispatchEvent(new Event('input'));
            });
        }
    }

    preencherDadosNFAtuais() {
        const nome      = document.getElementById('nome').value;
        const endereco  = document.getElementById('endereco').value;
        const cpf       = document.getElementById('cpf').value;
        const email     = document.getElementById('email').value;

        document.getElementById('nfNome').value     = nome;
        document.getElementById('nfEndereco').value = endereco;
        document.getElementById('nfCpf').value      = cpf;
        document.getElementById('nfEmail').value    = email;
        ['nfNome','nfEndereco','nfCpf','nfEmail'].forEach(id => {
            document.getElementById(id)?.dispatchEvent(new Event('input'));
        });
    }

    // ========== NAVEGAÇÃO ENTRE SEÇÕES ==========
    showSection(sectionNumber) {
        document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.progress-step').forEach(step => step.classList.remove('active'));

        document.getElementById(`section${sectionNumber}`)?.classList.add('active');

        for (let i = 1; i <= Math.min(sectionNumber, 4); i++) {
            document.querySelector(`.progress-step:nth-child(${i})`)?.classList.add('active');
        }

        this.currentSection = sectionNumber;
        console.log(`📄 Navegou para seção ${sectionNumber}`);
    }

    // ========== CONFIGURAÇÃO DE EVENTOS ==========
    setupEventListeners() {
        const section1NextBtn = document.getElementById('section1-next');
        if (section1NextBtn) {
            section1NextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (section1NextBtn.disabled) return;
                this.showSection(2);
            });
        }

        const section2Fields = ['nome', 'email', 'contato', 'cep', 'endereco', 'cidade-uf'];
        section2Fields.forEach(field => {
            document.getElementById(field)?.addEventListener('input', () => this.validateSection2());
        });

        const section3SubmitBtn = document.querySelector('#section3 .btn-next');
        if (section3SubmitBtn) {
            section3SubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(4);
            });
        }

        const form = document.getElementById('formularioCliente');
        if (form) {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                if (!window.clienteDatabase) {
                    alert('Sistema temporariamente indisponível. Tente novamente em alguns instantes.');
                    return;
                }
                window.clienteDatabase.estudantesData    = this.estudantesData;
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
