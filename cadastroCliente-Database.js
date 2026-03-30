// cadastroCliente-Database.js
// Gerencia a comunicação com o Firebase Firestore para o formulário de cadastro.
// Depende de firebase-config.js (FIREBASE_CONFIG_CLIENTES, RECAPTCHA_SITE_KEY_CLIENTES).

class ClienteDatabase {
    constructor() {
        this.firebaseApp          = null;
        this.firestore            = null;
        this.formData             = {};
        this.estudantesData       = [];
        this.ajustesFinaisData    = {};
        this.firebaseInitialized  = false;
        this._submitLock          = false; // Evita submissões duplicadas
        this.init();
    }

    async init() {
        await this.initializeFirebase();
    }

    // ========== INICIALIZAÇÃO DO FIREBASE ==========
    async initializeFirebase() {
        try {
            if (typeof firebase === 'undefined') {
                throw new Error('Biblioteca Firebase não encontrada.');
            }
            if (typeof firebase.firestore !== 'function') {
                throw new Error('Firestore não disponível.');
            }

            try {
                this.firebaseApp = firebase.initializeApp(FIREBASE_CONFIG_CLIENTES);
            } catch (error) {
                if (error.code === 'app/duplicate-app') {
                    this.firebaseApp = firebase.app();
                } else {
                    throw error;
                }
            }

            this.firestore           = firebase.firestore();
            this.firebaseInitialized = true;

            // ── App Check com reCAPTCHA v3 ────────────────────────────────────
            // Protege o formulário público contra bots e abuso de quota.
            // Ativo apenas em produção; em localhost o App Check não funciona
            // com domínios não cadastrados no reCAPTCHA.
            const isLocalhost = ['localhost', '127.0.0.1', ''].includes(
                window.location.hostname
            );
            if (!isLocalhost && typeof firebase.appCheck === 'function') {
                try {
                    const appCheck = firebase.appCheck(this.firebaseApp);
                    appCheck.activate(
                        new firebase.appCheck.ReCaptchaV3Provider(RECAPTCHA_SITE_KEY_CLIENTES),
                        true
                    );
                } catch (acErr) {
                    console.warn('[ClienteDB] App Check não ativado:', acErr.message);
                }
            }

            return true;

        } catch (error) {
            console.error('[ClienteDB] Erro ao inicializar Firebase:', error.message);
            this.firebaseApp         = null;
            this.firestore           = null;
            this.firebaseInitialized = false;
            return false;
        }
    }

    // ========== VERIFICAÇÃO DE CPF EXISTENTE ==========
    async checkCPFExists(cpf) {
        if (!this.firebaseInitialized) {
            await this.waitForFirebaseInitialization();
        }
        if (!this.firestore) return false;

        try {
            const querySnapshot = await this.firestore
                .collection('cadastroClientes')
                .where('cpf', '==', cpf)
                .get();
            return !querySnapshot.empty;
        } catch (error) {
            console.error('[ClienteDB] Erro ao verificar CPF:', error.code || error.message);
            return false;
        }
    }

    // ========== AGUARDAR INICIALIZAÇÃO DO FIREBASE ==========
    async waitForFirebaseInitialization(maxAttempts = 10) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (this.firebaseInitialized && this.firestore) return true;
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.error('[ClienteDB] Timeout aguardando inicialização do Firebase');
        return false;
    }

    // ========== COLETA COMPLETA DE DADOS DO FORMULÁRIO ==========
    collectFormData() {
        this.collectDadosPessoais();
        this.collectDadosEstudantes();
        this.collectAjustesFinais();
        this.processDataRelations();

        const timestamp = new Date();
        this.formData.dataCadastro        = timestamp.toISOString();
        this.formData.dataCadastroLegivel = timestamp.toLocaleString('pt-BR');
        this.formData.status              = 'Cliente Potencial';
    }

    // ========== DADOS PESSOAIS ==========
    collectDadosPessoais() {
        const fields = {
            nome:        document.getElementById('nome'),
            cpf:         document.getElementById('cpf'),
            email:       document.getElementById('email'),
            contato:     document.getElementById('contato'),
            cep:         document.getElementById('cep'),
            endereco:    document.getElementById('endereco'),
            cidadeUF:    document.getElementById('cidade-uf'),
            complemento: document.getElementById('complemento')
        };

        this.formData.nome        = this.getFieldValue(fields.nome);
        this.formData.cpf         = this.getFieldValue(fields.cpf, true);
        this.formData.email       = this.getFieldValue(fields.email);
        this.formData.contato     = this.getFieldValue(fields.contato, true);
        this.formData.cep         = this.getFieldValue(fields.cep, true);
        this.formData.endereco    = this.getFieldValue(fields.endereco);
        this.formData.cidadeUF    = this.getFieldValue(fields.cidadeUF);
        this.formData.complemento = this.getFieldValue(fields.complemento);
    }

    // ========== DADOS DOS ESTUDANTES ==========
    collectDadosEstudantes() {
        const quantidadeEstudantes = document.getElementById('quantidadeEstudantes');
        this.formData.quantidadeEstudantes = quantidadeEstudantes
            ? parseInt(quantidadeEstudantes.value)
            : 1;

        this.formData.estudantes = (this.estudantesData && this.estudantesData.length > 0)
            ? this.estudantesData
            : this.collectEstudantesManualmente();
    }

    collectEstudantesManualmente() {
        const estudantes      = [];
        const estudanteGroups = document.querySelectorAll('.estudante-group');

        estudanteGroups.forEach((group, index) => {
            const estudante = {
                nome:                      this.getFieldValue(group.querySelector('.estudante-nome')),
                escola:                    this.getFieldValue(group.querySelector('.estudante-escola')),
                aniversario:               this.getFieldValue(group.querySelector('.estudante-aniversario')),
                serie:                     this.getFieldValue(group.querySelector('.estudante-serie')),
                atendimentoEspecializado:  group.querySelector('.estudante-atendimento-especializado')?.checked || false,
                necessidades:              this.getNecessidadesSelecionadas(group),
                outraNecessidade:          this.getFieldValue(group.querySelector('.necessidade-outra')),
                possuiLaudo:               group.querySelector('.estudante-laudo')?.checked || false,
                atipicidade:               '',
                LinkGoogleMaps:            '',
                LinkLaudo:                 ''
            };
            estudante.atipicidade = this.processAtipicidade(estudante);
            estudantes.push(estudante);
        });

        return estudantes;
    }

    getNecessidadesSelecionadas(estudanteGroup) {
        const necessidades     = [];
        const itensSelecionados = estudanteGroup.querySelectorAll('.necessidade-item.selected');
        itensSelecionados.forEach(item => {
            const valor = item.getAttribute('data-value');
            if (valor) necessidades.push(valor);
        });
        return necessidades;
    }

    processAtipicidade(estudante) {
        if (!estudante.atendimentoEspecializado) return '';
        const todasNecessidades = [...estudante.necessidades];
        if (estudante.outraNecessidade && estudante.outraNecessidade.trim() !== '') {
            todasNecessidades.push(estudante.outraNecessidade.trim());
        }
        return todasNecessidades.join(', ');
    }

    // ========== AJUSTES FINAIS ==========
    collectAjustesFinais() {
        if (Object.keys(this.ajustesFinaisData).length > 0) {
            Object.assign(this.formData, this.ajustesFinaisData);
        } else {
            this.collectAjustesFinaisManualmente();
        }
    }

    collectAjustesFinaisManualmente() {
        const mesmoEnderecoSelect = document.getElementById('mesmoEndereco');
        const confirmaNFSelect    = document.getElementById('confirmaNF');

        this.formData.mesmoEndereco = mesmoEnderecoSelect
            ? mesmoEnderecoSelect.value === 'sim'
            : true;

        if (!this.formData.mesmoEndereco) {
            this.formData.cepAulas         = this.getFieldValue(document.getElementById('cepAulas'), true);
            this.formData.enderecoAulas    = this.getFieldValue(document.getElementById('enderecoAulas'));
            this.formData.cidadeUFAulas    = this.getFieldValue(document.getElementById('cidadeUFAulas'));
            this.formData.complementoAulas = this.getFieldValue(document.getElementById('complementoAulas'));
        } else {
            this.formData.cepAulas         = this.formData.cep;
            this.formData.enderecoAulas    = this.formData.endereco;
            this.formData.cidadeUFAulas    = this.formData.cidadeUF;
            this.formData.complementoAulas = this.formData.complemento;
        }

        this.formData.confirmaNF = confirmaNFSelect
            ? confirmaNFSelect.value === 'sim'
            : true;

        if (!this.formData.confirmaNF) {
            this.formData.nfNome     = this.getFieldValue(document.getElementById('nfNome'));
            this.formData.nfEndereco = this.getFieldValue(document.getElementById('nfEndereco'));
            this.formData.nfCpf      = this.getFieldValue(document.getElementById('nfCpf'), true);
            this.formData.nfEmail    = this.getFieldValue(document.getElementById('nfEmail'));
        } else {
            this.formData.nfNome     = this.formData.nome;
            this.formData.nfEndereco = this.formData.endereco;
            this.formData.nfCpf      = this.formData.cpf;
            this.formData.nfEmail    = this.formData.email;
        }
    }

    // ========== PROCESSAMENTO DE RELAÇÕES ENTRE DADOS ==========
    processDataRelations() {
        if (this.formData.mesmoEndereco) {
            this.formData.cepAulas         = this.formData.cep;
            this.formData.enderecoAulas    = this.formData.endereco;
            this.formData.cidadeUFAulas    = this.formData.cidadeUF;
            this.formData.complementoAulas = this.formData.complemento;
        }
        if (this.formData.confirmaNF) {
            this.formData.nfNome     = this.formData.nome;
            this.formData.nfEndereco = this.formData.endereco;
            this.formData.nfCpf      = this.formData.cpf;
            this.formData.nfEmail    = this.formData.email;
        }
        if (this.formData.estudantes && this.formData.estudantes.length > 0) {
            this.formData.estudantes.forEach(e => {
                e.atipicidade = this.processAtipicidade(e);
            });
        }
    }

    // ========== UTILITÁRIOS ==========
    getFieldValue(field, removeNonNumeric = false) {
        if (!field) return '';
        let value = field.value.trim();
        if (removeNonNumeric) value = value.replace(/\D/g, '');
        return value;
    }

    // ========== VALIDAÇÃO DE DADOS ==========
    validateFormData() {
        const errors = [];

        if (!this.formData.nome)                                      errors.push('Nome é obrigatório');
        if (!this.formData.cpf || this.formData.cpf.length !== 11)    errors.push('CPF inválido');
        if (!this.formData.email || !this.isValidEmail(this.formData.email)) errors.push('E-mail inválido');
        if (!this.formData.contato || this.formData.contato.length < 10)     errors.push('Contato inválido');
        if (!this.formData.cep || this.formData.cep.length !== 8)     errors.push('CEP inválido');
        if (!this.formData.endereco)                                  errors.push('Endereço é obrigatório');
        if (!this.formData.cidadeUF)                                  errors.push('Cidade-UF é obrigatório');

        if (!this.formData.estudantes || this.formData.estudantes.length === 0) {
            errors.push('É necessário cadastrar pelo menos um estudante');
        } else {
            this.formData.estudantes.forEach((estudante, index) => {
                if (!estudante.nome)    errors.push(`Nome do estudante ${index + 1} é obrigatório`);
                if (!estudante.escola)  errors.push(`Escola do estudante ${index + 1} é obrigatória`);
                if (!estudante.aniversario || !this.isValidDate(estudante.aniversario)) {
                    errors.push(`Aniversário do estudante ${index + 1} é inválido`);
                }
                if (!estudante.serie)   errors.push(`Série do estudante ${index + 1} é obrigatória`);
            });
        }

        return errors;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isValidDate(dateString) {
        const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!regex.test(dateString)) return false;
        const [, day, month, year] = dateString.match(regex);
        const date = new Date(year, month - 1, day);
        return date.getDate()   == day   &&
               date.getMonth()  == month - 1 &&
               date.getFullYear() == year;
    }

    // ========== ENVIO DO FORMULÁRIO ==========
    async handleFormSubmit() {
        // Bloqueia submissões duplicadas (duplo-clique, etc.)
        if (this._submitLock) return false;

        const submitBtn = document.getElementById('section4-submit');
        if (submitBtn) {
            submitBtn.disabled    = true;
            submitBtn.textContent = 'Enviando...';
        }
        this._submitLock = true;

        try {
            if (!this.firebaseInitialized) {
                await this.waitForFirebaseInitialization();
            }
            if (!this.firestore) {
                throw new Error('Erro de conexão com o banco de dados. Verifique sua internet e tente novamente.');
            }

            // Coleta e valida dados do formulário
            this.collectFormData();
            const validationErrors = this.validateFormData();
            if (validationErrors.length > 0) {
                throw new Error(`Erros de validação:\n${validationErrors.join('\n')}`);
            }

            // Verifica CPF duplicado antes de enviar
            const cpfJaExiste = await this.checkCPFExists(this.formData.cpf);
            if (cpfJaExiste) {
                throw new Error('Este CPF já está cadastrado. Entre em contato com o suporte se necessário.');
            }

            const finalData = this.prepareFinalData();
            await this.firestore.collection('cadastroClientes').add(finalData);

            if (window.clienteAnimacoes) {
                window.clienteAnimacoes.showSection(5);
            }

            return true;

        } catch (error) {
            let errorMessage = 'Erro ao enviar formulário. ';

            if (
                error.code === 'permission-denied' ||
                (error.message && error.message.includes('permission-denied'))
            ) {
                errorMessage += 'Erro de permissão. Por favor, recarregue a página e tente novamente.';
            } else if (error.message && error.message.includes('validação')) {
                errorMessage = error.message;
            } else if (error.message && error.message.includes('CPF')) {
                errorMessage = error.message;
            } else {
                errorMessage += 'Por favor, tente novamente.';
            }

            alert(errorMessage);
            return false;

        } finally {
            this._submitLock = false;
            if (submitBtn) {
                submitBtn.disabled    = false;
                submitBtn.textContent = 'Finalizar Cadastro';
            }
        }
    }

    // ========== PREPARAÇÃO DOS DADOS FINAIS ==========
    prepareFinalData() {
        const estudantesProcessados = this.formData.estudantes.map((estudante, index) => ({
            ...estudante,
            LinkGoogleMaps:                  estudante.LinkGoogleMaps || '',
            [`LinkLaudoAluno_${index + 1}`]: estudante.LinkLaudo || ''
        }));

        return {
            // Dados Pessoais
            nome:        this.formData.nome     || 'Não informado',
            cpf:         this.formData.cpf      || '',
            email:       this.formData.email    || '',
            contato:     this.formData.contato  || '',
            // Endereço do Contratante
            cep:         this.formData.cep      || '',
            endereco:    this.formData.endereco || '',
            cidadeUF:    this.formData.cidadeUF || '',
            complemento: this.formData.complemento || '',
            // Estudantes
            quantidadeEstudantes: this.formData.quantidadeEstudantes || 1,
            estudantes:           estudantesProcessados,
            // Endereço das Aulas
            mesmoEndereco:    this.formData.mesmoEndereco  !== undefined ? this.formData.mesmoEndereco  : true,
            cepAulas:         this.formData.cepAulas         || '',
            enderecoAulas:    this.formData.enderecoAulas    || '',
            cidadeUFAulas:    this.formData.cidadeUFAulas    || '',
            complementoAulas: this.formData.complementoAulas || '',
            // Dados da NF
            confirmaNF:  this.formData.confirmaNF !== undefined ? this.formData.confirmaNF : true,
            nfNome:      this.formData.nfNome     || '',
            nfEndereco:  this.formData.nfEndereco || '',
            nfCpf:       this.formData.nfCpf      || '',
            nfEmail:     this.formData.nfEmail    || '',
            // Metadados
            status:              'Cliente Potencial',
            dataCadastro:        this.formData.dataCadastro,
            dataCadastroLegivel: this.formData.dataCadastroLegivel,
            timestamp:           new Date()
        };
    }

    // ========== MÉTODOS PÚBLICOS ==========
    async isDatabaseReady() {
        if (!this.firebaseInitialized) await this.waitForFirebaseInitialization();
        return this.firebaseInitialized && this.firestore !== null;
    }

    getFormData()   { return this.formData; }

    clearFormData() {
        this.formData          = {};
        this.estudantesData    = [];
        this.ajustesFinaisData = {};
    }
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', function () {
    window.clienteDatabase = new ClienteDatabase();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClienteDatabase;
}
