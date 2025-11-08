// Configurações do Firebase para cadastro de clientes
const FIREBASE_CONFIG_CLIENTES = {
    apiKey: "AIzaSyDPPbSA8SB-L_giAhWIqGbPGSMRBDTPi40",
    authDomain: "master-ecossistemaprofessor.firebaseapp.com",
    databaseURL: "https://master-ecossistemaprofessor-default-rtdb.firebaseio.com",
    projectId: "master-ecossistemaprofessor",
    storageBucket: "master-ecossistemaprofessor.firebasestorage.app",
    messagingSenderId: "532224860209",
    appId: "1:532224860209:web:686657b6fae13b937cf510",
    measurementId: "G-B0KMX4E67D"
};

// Aplicação de banco de dados para clientes
class ClienteDatabase {
    constructor() {
        this.firebaseApp = null;
        this.firestore = null;
        this.formData = {};
        this.estudantesData = [];
        this.ajustesFinaisData = {};
        this.firebaseInitialized = false;
        this.init();
    }

    async init() {
        await this.initializeFirebase();
        console.log('✅ Database inicializado');
    }

    // ========== INICIALIZAÇÃO DO FIREBASE ==========
    async initializeFirebase() {
        try {
            console.log('🔥 Inicializando Firebase...');
            
            if (typeof firebase === 'undefined') {
                throw new Error('Biblioteca Firebase não encontrada. Verifique se o script CDN foi carregado.');
            }
            
            if (typeof firebase.firestore !== 'function') {
                throw new Error('Firestore não disponível. Verifique se firebase-firestore-compat.js foi carregado.');
            }
            
            // Tenta usar instância existente ou cria uma nova
            try {
                this.firebaseApp = firebase.initializeApp(FIREBASE_CONFIG_CLIENTES);
                console.log('✅ Nova instância Firebase criada');
            } catch (error) {
                if (error.code === 'app/duplicate-app') {
                    console.log('⚠️ Firebase já inicializado, usando instância existente');
                    this.firebaseApp = firebase.app();
                } else {
                    throw error;
                }
            }
            
            this.firestore = firebase.firestore();
            this.firebaseInitialized = true;
            
            console.log('✅ Firebase Firestore inicializado com sucesso');
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao inicializar Firebase:', error);
            this.firebaseApp = null;
            this.firestore = null;
            this.firebaseInitialized = false;
            return false;
        }
    }

    // ========== VERIFICAÇÃO DE CPF EXISTENTE ==========
    async checkCPFExists(cpf) {
        if (!this.firebaseInitialized) {
            console.log('⏳ Firebase não inicializado, aguardando...');
            await this.waitForFirebaseInitialization();
        }

        if (!this.firestore) {
            console.error('❌ Firestore não inicializado após espera');
            return false;
        }

        try {
            console.log('🔍 Verificando se CPF existe no banco:', cpf);
            
            const querySnapshot = await this.firestore
                .collection('cadastroClientes')
                .where('cpf', '==', cpf)
                .get();
            
            const exists = !querySnapshot.empty;
            console.log(`✅ Verificação CPF: ${exists ? 'EXISTE' : 'NÃO EXISTE'}`);
            
            return exists;
        } catch (error) {
            console.error('❌ Erro ao verificar CPF:', error);
            return false;
        }
    }

    // ========== AGUARDAR INICIALIZAÇÃO DO FIREBASE ==========
    async waitForFirebaseInitialization(maxAttempts = 10) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (this.firebaseInitialized && this.firestore) {
                console.log(`✅ Firebase inicializado na tentativa ${attempt}`);
                return true;
            }
            console.log(`⏳ Aguardando Firebase... tentativa ${attempt}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.error('❌ Timeout aguardando inicialização do Firebase');
        return false;
    }

    // ========== COLETA COMPLETA DE DADOS DO FORMULÁRIO ==========
    collectFormData() {
        this.collectDadosPessoais();
        this.collectDadosEstudantes();
        this.collectAjustesFinais();
        this.processDataRelations();
        
        // Timestamp
        const timestamp = new Date();
        this.formData.dataCadastro = timestamp.toISOString();
        this.formData.dataCadastroLegivel = timestamp.toLocaleString('pt-BR');
        this.formData.status = 'Cliente Potencial';
        
        console.log('📊 Dados coletados:', this.formData);
    }

    // ========== DADOS PESSOAIS ==========
    collectDadosPessoais() {
        const fields = {
            nome: document.getElementById('nome'),
            cpf: document.getElementById('cpf'),
            email: document.getElementById('email'),
            contato: document.getElementById('contato'),
            cep: document.getElementById('cep'),
            endereco: document.getElementById('endereco'),
            cidadeUF: document.getElementById('cidade-uf'),
            complemento: document.getElementById('complemento')
        };

        this.formData.nome = this.getFieldValue(fields.nome);
        this.formData.cpf = this.getFieldValue(fields.cpf, true); // Remove caracteres não numéricos
        this.formData.email = this.getFieldValue(fields.email);
        this.formData.contato = this.getFieldValue(fields.contato, true); // Remove caracteres não numéricos
        this.formData.cep = this.getFieldValue(fields.cep, true); // Remove caracteres não numéricos
        this.formData.endereco = this.getFieldValue(fields.endereco);
        this.formData.cidadeUF = this.getFieldValue(fields.cidadeUF);
        this.formData.complemento = this.getFieldValue(fields.complemento);
    }

    // ========== DADOS DOS ESTUDANTES ==========
    collectDadosEstudantes() {
        const quantidadeEstudantes = document.getElementById('quantidadeEstudantes');
        this.formData.quantidadeEstudantes = quantidadeEstudantes ? parseInt(quantidadeEstudantes.value) : 1;
        
        // Se temos dados dos estudantes das animações, usamos eles
        if (this.estudantesData && this.estudantesData.length > 0) {
            this.formData.estudantes = this.estudantesData;
        } else {
            // Fallback: coleta manual dos campos dos estudantes
            this.formData.estudantes = this.collectEstudantesManualmente();
        }
    }

    collectEstudantesManualmente() {
        const estudantes = [];
        const estudanteGroups = document.querySelectorAll('.estudante-group');
        
        estudanteGroups.forEach((group, index) => {
            const estudante = {
                nome: this.getFieldValue(group.querySelector('.estudante-nome')),
                escola: this.getFieldValue(group.querySelector('.estudante-escola')),
                aniversario: this.getFieldValue(group.querySelector('.estudante-aniversario')),
                serie: this.getFieldValue(group.querySelector('.estudante-serie')),
                atendimentoEspecializado: group.querySelector('.estudante-atendimento-especializado')?.checked || false,
                necessidades: this.getNecessidadesSelecionadas(group),
                outraNecessidade: this.getFieldValue(group.querySelector('.necessidade-outra')),
                possuiLaudo: group.querySelector('.estudante-laudo')?.checked || false,
                atipicidade: '',
                LinkGoogleMaps: '', // NOVA VARIÁVEL
                LinkLaudo: ''       // NOVA VARIÁVEL
            };
            
            // Processa atipicidade
            estudante.atipicidade = this.processAtipicidade(estudante);
            estudantes.push(estudante);
        });
        
        return estudantes;
    }

    getNecessidadesSelecionadas(estudanteGroup) {
        const necessidades = [];
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
        // Se temos dados dos ajustes finais das animações, usamos eles
        if (Object.keys(this.ajustesFinaisData).length > 0) {
            Object.assign(this.formData, this.ajustesFinaisData);
        } else {
            // Fallback: coleta manual dos ajustes finais
            this.collectAjustesFinaisManualmente();
        }
    }

    collectAjustesFinaisManualmente() {
        const mesmoEnderecoSelect = document.getElementById('mesmoEndereco');
        const confirmaNFSelect = document.getElementById('confirmaNF');
        
        // Endereço das aulas
        this.formData.mesmoEndereco = mesmoEnderecoSelect ? mesmoEnderecoSelect.value === 'sim' : true;
        
        if (!this.formData.mesmoEndereco) {
            this.formData.cepAulas = this.getFieldValue(document.getElementById('cepAulas'), true);
            this.formData.enderecoAulas = this.getFieldValue(document.getElementById('enderecoAulas'));
            this.formData.cidadeUFAulas = this.getFieldValue(document.getElementById('cidadeUFAulas'));
            this.formData.complementoAulas = this.getFieldValue(document.getElementById('complementoAulas'));
        } else {
            // Copia dados do endereço do contratante
            this.formData.cepAulas = this.formData.cep;
            this.formData.enderecoAulas = this.formData.endereco;
            this.formData.cidadeUFAulas = this.formData.cidadeUF;
            this.formData.complementoAulas = this.formData.complemento;
        }
        
        // Dados da NF
        this.formData.confirmaNF = confirmaNFSelect ? confirmaNFSelect.value === 'sim' : true;
        
        if (!this.formData.confirmaNF) {
            this.formData.nfNome = this.getFieldValue(document.getElementById('nfNome'));
            this.formData.nfEndereco = this.getFieldValue(document.getElementById('nfEndereco'));
            this.formData.nfCpf = this.getFieldValue(document.getElementById('nfCpf'), true);
            this.formData.nfEmail = this.getFieldValue(document.getElementById('nfEmail'));
        } else {
            // Copia dados do contratante
            this.formData.nfNome = this.formData.nome;
            this.formData.nfEndereco = this.formData.endereco;
            this.formData.nfCpf = this.formData.cpf;
            this.formData.nfEmail = this.formData.email;
        }
    }

    // ========== PROCESSAMENTO DE RELAÇÕES ENTRE DADOS ==========
    processDataRelations() {
        // Garante que os dados de endereço das aulas estejam corretos
        if (this.formData.mesmoEndereco) {
            this.formData.cepAulas = this.formData.cep;
            this.formData.enderecoAulas = this.formData.endereco;
            this.formData.cidadeUFAulas = this.formData.cidadeUF;
            this.formData.complementoAulas = this.formData.complemento;
        }
        
        // Garante que os dados da NF estejam corretos
        if (this.formData.confirmaNF) {
            this.formData.nfNome = this.formData.nome;
            this.formData.nfEndereco = this.formData.endereco;
            this.formData.nfCpf = this.formData.cpf;
            this.formData.nfEmail = this.formData.email;
        }
        
        // Processa atipicidade para cada estudante
        if (this.formData.estudantes && this.formData.estudantes.length > 0) {
            this.formData.estudantes.forEach(estudante => {
                estudante.atipicidade = this.processAtipicidade(estudante);
            });
        }
    }

    // ========== UTILITÁRIOS ==========
    getFieldValue(field, removeNonNumeric = false) {
        if (!field) return '';
        let value = field.value.trim();
        if (removeNonNumeric) {
            value = value.replace(/\D/g, '');
        }
        return value;
    }

    // ========== VALIDAÇÃO DE DADOS ==========
    validateFormData() {
        const errors = [];
        
        // Dados pessoais obrigatórios
        if (!this.formData.nome) errors.push('Nome é obrigatório');
        if (!this.formData.cpf || this.formData.cpf.length !== 11) errors.push('CPF inválido');
        if (!this.formData.email || !this.isValidEmail(this.formData.email)) errors.push('E-mail inválido');
        if (!this.formData.contato || this.formData.contato.length < 10) errors.push('Contato inválido');
        if (!this.formData.cep || this.formData.cep.length !== 8) errors.push('CEP inválido');
        if (!this.formData.endereco) errors.push('Endereço é obrigatório');
        if (!this.formData.cidadeUF) errors.push('Cidade-UF é obrigatório');
        
        // Dados dos estudantes
        if (!this.formData.estudantes || this.formData.estudantes.length === 0) {
            errors.push('É necessário cadastrar pelo menos um estudante');
        } else {
            this.formData.estudantes.forEach((estudante, index) => {
                if (!estudante.nome) errors.push(`Nome do estudante ${index + 1} é obrigatório`);
                if (!estudante.escola) errors.push(`Escola do estudante ${index + 1} é obrigatória`);
                if (!estudante.aniversario || !this.isValidDate(estudante.aniversario)) {
                    errors.push(`Aniversário do estudante ${index + 1} é inválido`);
                }
                if (!estudante.serie) errors.push(`Série do estudante ${index + 1} é obrigatória`);
            });
        }
        
        return errors;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidDate(dateString) {
        const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!regex.test(dateString)) return false;
        
        const [, day, month, year] = dateString.match(regex);
        const date = new Date(year, month - 1, day);
        
        return date.getDate() == day && 
               date.getMonth() == month - 1 && 
               date.getFullYear() == year;
    }

    // ========== TESTE DE CONEXÃO ==========
    async testFirebaseConnection() {
        if (!this.firestore) {
            console.error('❌ Firestore não inicializado');
            return false;
        }
        
        try {
            console.log('🔍 Testando conexão com Firestore...');
            
            const testRef = this.firestore.collection('connectionTest').doc('testClientes');
            const testData = {
                timestamp: new Date(),
                test: true,
                message: 'Teste de conexão - Clientes'
            };
            
            await testRef.set(testData);
            console.log('✅ Dados de teste escritos com sucesso');
            
            const doc = await testRef.get();
            const testResult = doc.data();
            console.log('✅ Dados de teste lidos com sucesso:', testResult);
            
            await testRef.delete();
            console.log('✅ Dados de teste removidos');
            
            if (testResult && testResult.test === true) {
                console.log('✅ Conexão com Firestore: OK');
                return true;
            }
            
            throw new Error('Teste de conexão falhou');
        } catch (error) {
            console.error('❌ Erro na conexão com Firestore:', error);
            
            if (error.code === 'permission-denied') {
                console.error('🔒 Erro de permissão: Verifique as regras de segurança do Firestore');
                return false;
            }
            
            return false;
        }
    }

    // ========== ENVIO DO FORMULÁRIO ==========
    async handleFormSubmit() {
        const submitBtn = document.getElementById('section4-submit');
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
        }

        try {
            console.log('🚀 Iniciando envio do formulário...');
            
            // Aguarda inicialização se necessário
            if (!this.firebaseInitialized) {
                console.log('⏳ Firebase não inicializado, aguardando...');
                await this.waitForFirebaseInitialization();
            }
            
            // Testa conexão
            const connectionOk = await this.testFirebaseConnection();
            if (!connectionOk) {
                throw new Error('Erro de conexão com o banco de dados. Verifique sua conexão com a internet e tente novamente.');
            }

            // Coleta e valida dados
            this.collectFormData();
            const validationErrors = this.validateFormData();
            
            if (validationErrors.length > 0) {
                throw new Error(`Erros de validação:\n${validationErrors.join('\n')}`);
            }

            console.log('=== 📊 DADOS VALIDADOS E PRONTOS PARA ENVIO ===');
            console.log('Dados Pessoais:', {
                nome: this.formData.nome,
                cpf: this.formData.cpf,
                email: this.formData.email,
                contato: this.formData.contato
            });
            console.log('Endereço:', {
                cep: this.formData.cep,
                endereco: this.formData.endereco,
                cidadeUF: this.formData.cidadeUF,
                complemento: this.formData.complemento
            });
            console.log('Quantidade de Estudantes:', this.formData.quantidadeEstudantes);
            console.log('Estudantes:', this.formData.estudantes);
            console.log('Ajustes Finais:', {
                mesmoEndereco: this.formData.mesmoEndereco,
                cepAulas: this.formData.cepAulas,
                enderecoAulas: this.formData.enderecoAulas,
                confirmaNF: this.formData.confirmaNF,
                nfNome: this.formData.nfNome
            });
            console.log('==============================================');

            // Prepara dados finais para envio
            const finalData = this.prepareFinalData();

            console.log('📤 ENVIANDO PARA FIRESTORE...');
            const docRef = await this.firestore.collection('cadastroClientes').add(finalData);

            console.log('✅ Dados do cliente enviados com sucesso para Firestore');
            console.log('📝 ID do documento:', docRef.id);
            
            // Navegar para seção de sucesso
            if (window.clienteAnimacoes) {
                window.clienteAnimacoes.showSection(5);
            }

            return true;

        } catch (error) {
            console.error('❌ Erro ao enviar formulário:', error);
            
            let errorMessage = 'Erro ao enviar formulário. ';
            
            if (error.message.includes('permission-denied')) {
                errorMessage += 'Erro de permissão no banco de dados.';
            } else if (error.message.includes('validation')) {
                errorMessage += `\n\n${error.message}`;
            } else {
                errorMessage += 'Por favor, tente novamente.';
            }
            
            alert(errorMessage);
            return false;
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Finalizar Cadastro';
            }
        }
    }

    // ========== PREPARAÇÃO DOS DADOS FINAIS ==========
    prepareFinalData() {
        // Prepara os dados dos estudantes com as novas variáveis
        const estudantesProcessados = this.formData.estudantes.map((estudante, index) => {
            return {
                ...estudante,
                // Garante que as novas variáveis estejam presentes
                LinkGoogleMaps: estudante.LinkGoogleMaps || '',
                // Cria variáveis específicas para cada estudante (LinkLaudoAluno_X)
                [`LinkLaudoAluno_${index + 1}`]: estudante.LinkLaudo || ''
            };
        });

        return {
            // Dados Pessoais
            nome: this.formData.nome || 'Não informado',
            cpf: this.formData.cpf || '',
            email: this.formData.email || '',
            contato: this.formData.contato || '',
            
            // Endereço do Contratante
            cep: this.formData.cep || '',
            endereco: this.formData.endereco || '',
            cidadeUF: this.formData.cidadeUF || '',
            complemento: this.formData.complemento || '',
            
            // Dados dos Estudantes
            quantidadeEstudantes: this.formData.quantidadeEstudantes || 1,
            estudantes: estudantesProcessados,
            
            // Ajustes Finais - Endereço das Aulas
            mesmoEndereco: this.formData.mesmoEndereco !== undefined ? this.formData.mesmoEndereco : true,
            cepAulas: this.formData.cepAulas || '',
            enderecoAulas: this.formData.enderecoAulas || '',
            cidadeUFAulas: this.formData.cidadeUFAulas || '',
            complementoAulas: this.formData.complementoAulas || '',
            
            // Ajustes Finais - Dados da NF
            confirmaNF: this.formData.confirmaNF !== undefined ? this.formData.confirmaNF : true,
            nfNome: this.formData.nfNome || '',
            nfEndereco: this.formData.nfEndereco || '',
            nfCpf: this.formData.nfCpf || '',
            nfEmail: this.formData.nfEmail || '',
            
            // Metadados
            status: 'Cliente Potencial',
            dataCadastro: this.formData.dataCadastro,
            dataCadastroLegivel: this.formData.dataCadastroLegivel,
            timestamp: new Date()
        };
    }

    // ========== MÉTODOS DE UTILIDADE PÚBLICA ==========
    async isDatabaseReady() {
        if (!this.firebaseInitialized) {
            await this.waitForFirebaseInitialization();
        }
        return this.firebaseInitialized && this.firestore !== null;
    }

    getFormData() {
        return this.formData;
    }

    clearFormData() {
        this.formData = {};
        this.estudantesData = [];
        this.ajustesFinaisData = {};
    }
}

// ========== INICIALIZAÇÃO DO BANCO DE DADOS ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando aplicação de banco de dados...');
    window.clienteDatabase = new ClienteDatabase();
});

// ========== EXPORTAÇÃO PARA USO EM MÓDULOS ==========
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClienteDatabase;
}