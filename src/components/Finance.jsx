import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { formatDate } from '../utils/helpers';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Plus, 
  Check, 
  Calculator, 
  ShieldAlert, 
  UserCheck, 
  Calendar, 
  User, 
  Percent, 
  Layers,
  ChevronRight,
  AlertTriangle,
  Edit2,
  Trash2,
  ShoppingBag,
  Lock
} from 'lucide-react';

const Finance = ({ user }) => {
  const isUserAdmin = user?.user_metadata?.role === 'admin';
  
  // Tabs management
  // Admin tabs: 'fluxo', 'vendas', 'receber', 'pagar', 'comissoes'
  // Seller tabs: 'simulador', 'minhas_vendas', 'minhas_comissoes'
  const [activeTab, setActiveTab] = useState(isUserAdmin ? 'fluxo' : 'simulador');
  
  // Data States
  const [sales, setSales] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [payables, setPayables] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Modals
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Edit mode state
  const [editingSaleId, setEditingSaleId] = useState(null); // ID of sale being edited (null = new sale)
  const [deleteConfirmSaleId, setDeleteConfirmSaleId] = useState(null); // Sale ID awaiting delete confirmation

  // Form States (New Sale)
  const [newSale, setNewSale] = useState({
    customer_id: '',
    pricing_mode: 'per_nozzle', // 'per_nozzle' or 'flat_rate'
    physical_nozzles_count: 60,
    boom_width_m: 30,
    nozzle_spacing_cm: 50,
    nozzles_count: 60, // Electrostatic modules count
    price_per_nozzle: 1500,
    flat_rate_amount: 90000,
    payment_terms: '30_60_90', // Default to 30/60/90 Dias
    payment_method: 'Pix / Boleto',
    notes: ''
  });

  // Dynamic Agricultural Installments Schedule
  const [installments, setInstallments] = useState([]);

  // Helper for date offsets
  const getOffsetDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Helper to suggest agricultural crop dates
  const getNextYearDate = (monthDay) => {
    const year = new Date().getFullYear();
    const currentYearDate = `${year}-${monthDay}`;
    if (new Date(currentYearDate) <= new Date()) {
      return `${year + 1}-${monthDay}`;
    }
    return currentYearDate;
  };

  // Pricing Mode & Total calculation helpers
  const getSaleTotal = () => {
    if (newSale.pricing_mode === 'per_nozzle') {
      return (Number(newSale.nozzles_count) || 0) * (Number(newSale.price_per_nozzle) || 0);
    } else {
      return Number(newSale.flat_rate_amount) || 0;
    }
  };

  const getEquivalentPricePerNozzle = () => {
    const modules = Number(newSale.nozzles_count) || 1;
    return getSaleTotal() / modules;
  };

  // Helper to generate dynamic default schedules
  const generateDefaultInstallments = (terms, total) => {
    const today = new Date().toISOString().split('T')[0];
    switch (terms) {
      case '1x':
        return [
          { number: 1, label: 'À Vista', percentage: 100, amount: total, due_date: today, notes: 'Pagamento à vista' }
        ];
      case '30_60':
        return [
          { number: 1, label: '30 Dias', percentage: 50, amount: parseFloat((total * 0.5).toFixed(2)), due_date: getOffsetDate(30), notes: 'Parcela 1' },
          { number: 2, label: '60 Dias', percentage: 50, amount: parseFloat((total * 0.5).toFixed(2)), due_date: getOffsetDate(60), notes: 'Parcela 2' }
        ];
      case '30_60_90':
        return [
          { number: 1, label: '30 Dias', percentage: 33.33, amount: parseFloat((total * 0.3333).toFixed(2)), due_date: getOffsetDate(30), notes: 'Parcela 1' },
          { number: 2, label: '60 Dias', percentage: 33.33, amount: parseFloat((total * 0.3333).toFixed(2)), due_date: getOffsetDate(60), notes: 'Parcela 2' },
          { number: 3, label: '90 Dias', percentage: 33.34, amount: parseFloat((total - (total * 0.3333) * 2).toFixed(2)), due_date: getOffsetDate(90), notes: 'Parcela 3' }
        ];
      case 'entrada_safra':
      case 'entrada_safra_abril':
        return [
          { number: 1, label: 'Entrada (Instalação)', percentage: 50, amount: parseFloat((total * 0.5).toFixed(2)), due_date: today, notes: 'Entrada na instalação' },
          { number: 2, label: 'Safra (30/04)', percentage: 50, amount: parseFloat((total * 0.5).toFixed(2)), due_date: getNextYearDate('04-30'), notes: 'Pagamento na Safra' }
        ];
      case 'entrada_safra_marco':
        return [
          { number: 1, label: 'Entrada (Instalação)', percentage: 50, amount: parseFloat((total * 0.5).toFixed(2)), due_date: today, notes: 'Entrada na instalação' },
          { number: 2, label: 'Safra (30/03)', percentage: 50, amount: parseFloat((total * 0.5).toFixed(2)), due_date: getNextYearDate('03-30'), notes: 'Pagamento na Safra' }
        ];
      case 'entrada_safra_safrinha':
      case 'entrada_safra_safrinha_abril_junho':
        return [
          { number: 1, label: 'Entrada (Instalação)', percentage: 33.33, amount: parseFloat((total * 0.3333).toFixed(2)), due_date: today, notes: 'Entrada na instalação' },
          { number: 2, label: 'Safra (30/04)', percentage: 33.33, amount: parseFloat((total * 0.3333).toFixed(2)), due_date: getNextYearDate('04-30'), notes: 'Pagamento na Safra' },
          { number: 3, label: 'Safrinha (30/06)', percentage: 33.34, amount: parseFloat((total - (total * 0.3333) * 2).toFixed(2)), due_date: getNextYearDate('06-30'), notes: 'Pagamento na Safrinha' }
        ];
      case 'entrada_safra_safrinha_marco_junho':
        return [
          { number: 1, label: 'Entrada (Instalação)', percentage: 33.33, amount: parseFloat((total * 0.3333).toFixed(2)), due_date: today, notes: 'Entrada na instalação' },
          { number: 2, label: 'Safra (30/03)', percentage: 33.33, amount: parseFloat((total * 0.3333).toFixed(2)), due_date: getNextYearDate('03-30'), notes: 'Pagamento na Safra' },
          { number: 3, label: 'Safrinha (30/06)', percentage: 33.34, amount: parseFloat((total - (total * 0.3333) * 2).toFixed(2)), due_date: getNextYearDate('06-30'), notes: 'Pagamento na Safrinha' }
        ];
      case 'entrada_safra_safrinha_abril_julho':
        return [
          { number: 1, label: 'Entrada (Instalação)', percentage: 33.33, amount: parseFloat((total * 0.3333).toFixed(2)), due_date: today, notes: 'Entrada na instalação' },
          { number: 2, label: 'Safra (30/04)', percentage: 33.33, amount: parseFloat((total * 0.3333).toFixed(2)), due_date: getNextYearDate('04-30'), notes: 'Pagamento na Safra' },
          { number: 3, label: 'Safrinha (30/07)', percentage: 33.34, amount: parseFloat((total - (total * 0.3333) * 2).toFixed(2)), due_date: getNextYearDate('07-30'), notes: 'Pagamento na Safrinha' }
        ];
      case 'customizado':
      default:
        return [
          { number: 1, label: 'Parcela 1', percentage: 100, amount: total, due_date: today, notes: 'Parcela única personalizada' }
        ];
    }
  };

  // Form States (New Expense / Payable)
  const [newExpense, setNewExpense] = useState({
    supplier_name: '',
    description: '',
    category: 'Matéria-prima',
    amount: '',
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchFinancialData();
  }, [user]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      // Fetch customers for selector
      const { data: custData } = await supabase.from('customers').select('*');
      setCustomers(custData || []);

      // Fetch profiles to map seller names
      const { data: profilesData } = await supabase.from('profiles').select('*');
      const sellersList = (profilesData || []).filter(p => p.role === 'seller');
      setSellers(sellersList);

      // Fetch Sales
      const { data: salesData } = await supabase.from('sales').select('*').order('sale_date', { ascending: false });
      setSales(salesData || []);

      // Fetch Receivables
      const { data: recData } = await supabase.from('accounts_receivable').select('*').order('due_date', { ascending: true });
      setReceivables(recData || []);

      // Fetch Payables
      const { data: payData } = await supabase.from('accounts_payable').select('*').order('due_date', { ascending: true });
      setPayables(payData || []);

      // Fetch Commissions
      const { data: commData } = await supabase.from('commissions').select('*').order('created_at', { ascending: false });
      setCommissions(commData || []);

    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper Calculations
  const TAX_RATE = 0.10; // 10%
  const COMMISSION_RATE = 0.10; // 10%
  const NOZZLE_BASE_PRICE = 1100; // R$ 1.100,00

  // 35cm Spacing Suggestion Rule
  useEffect(() => {
    const phys = Number(newSale.physical_nozzles_count) || 0;
    const spacing = Number(newSale.nozzle_spacing_cm) || 50;
    if (spacing === 35) {
      const suggestedModules = Math.ceil(phys / 2);
      setNewSale(prev => ({ ...prev, nozzles_count: suggestedModules }));
    } else {
      setNewSale(prev => ({ ...prev, nozzles_count: phys }));
    }
  }, [newSale.physical_nozzles_count, newSale.nozzle_spacing_cm]);

  // Dynamic Installments Auto-generation on Terms or Total Value change
  useEffect(() => {
    if (newSale.payment_terms !== 'customizado') {
      const total = getSaleTotal();
      const generated = generateDefaultInstallments(newSale.payment_terms, total);
      setInstallments(generated);
    }
  }, [newSale.payment_terms, newSale.nozzles_count, newSale.price_per_nozzle, newSale.flat_rate_amount, newSale.pricing_mode]);

  // 1. Calculations for the Sales Simulator
  const simNozzles = Number(newSale.nozzles_count) || 0; // electrostatic modules count
  const simPhysicalNozzles = Number(newSale.physical_nozzles_count) || 0;
  const simSpacing = Number(newSale.nozzle_spacing_cm) || 50;
  const simBoomWidth = Number(newSale.boom_width_m) || 0;

  const simGrossTotal = getSaleTotal();
  const simMinTotal = simNozzles * NOZZLE_BASE_PRICE;
  const simEquivalentPrice = getEquivalentPricePerNozzle();
  const simTaxes = simGrossTotal * TAX_RATE;
  const simNetTotal = simGrossTotal - simTaxes;
  const simCommission = simNetTotal * COMMISSION_RATE;
  const isBelowMinPrice = simEquivalentPrice < NOZZLE_BASE_PRICE;

  // Installment Sum Checks
  const totalPercentSum = installments.reduce((sum, inst) => sum + (Number(inst.percentage) || 0), 0);
  const totalAmountSum = installments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
  const isPercentValid = Math.abs(totalPercentSum - 100) < 0.05;
  const isAmountValid = Math.abs(totalAmountSum - simGrossTotal) < 1.0;

  // Installment Grid Handlers
  const handleInstallmentPercentChange = (index, value) => {
    const pct = parseFloat(value) || 0;
    const newInsts = [...installments];
    newInsts[index].percentage = pct;
    newInsts[index].amount = parseFloat((simGrossTotal * (pct / 100)).toFixed(2));
    
    setNewSale(prev => ({ ...prev, payment_terms: 'customizado' }));
    setInstallments(newInsts);
  };

  const handleInstallmentAmountChange = (index, value) => {
    const amt = parseFloat(value) || 0;
    const newInsts = [...installments];
    newInsts[index].amount = amt;
    newInsts[index].percentage = parseFloat(((amt / simGrossTotal) * 100).toFixed(2));
    
    setNewSale(prev => ({ ...prev, payment_terms: 'customizado' }));
    setInstallments(newInsts);
  };

  const handleInstallmentDateChange = (index, value) => {
    const newInsts = [...installments];
    newInsts[index].due_date = value;
    
    setNewSale(prev => ({ ...prev, payment_terms: 'customizado' }));
    setInstallments(newInsts);
  };

  const handleInstallmentLabelChange = (index, value) => {
    const newInsts = [...installments];
    newInsts[index].label = value;
    
    setNewSale(prev => ({ ...prev, payment_terms: 'customizado' }));
    setInstallments(newInsts);
  };

  const addInstallment = () => {
    const today = new Date().toISOString().split('T')[0];
    const num = installments.length + 1;
    setNewSale(prev => ({ ...prev, payment_terms: 'customizado' }));
    setInstallments([
      ...installments,
      { number: num, label: `Parcela ${num}`, percentage: 0, amount: 0, due_date: today, notes: '' }
    ]);
  };

  const removeInstallment = (index) => {
    if (installments.length <= 1) return;
    const filtered = installments.filter((_, i) => i !== index).map((inst, i) => ({
      ...inst,
      number: i + 1
    }));
    setNewSale(prev => ({ ...prev, payment_terms: 'customizado' }));
    setInstallments(filtered);
  };

  const autoAdjustLastInstallment = () => {
    if (installments.length === 0) return;
    const newInsts = [...installments];
    const lastIndex = newInsts.length - 1;
    if (lastIndex === 0) {
      newInsts[0].percentage = 100;
      newInsts[0].amount = simGrossTotal;
    } else {
      let sumPctExceptLast = 0;
      let sumAmtExceptLast = 0;
      for (let i = 0; i < lastIndex; i++) {
        sumPctExceptLast += Number(newInsts[i].percentage) || 0;
        sumAmtExceptLast += Number(newInsts[i].amount) || 0;
      }
      newInsts[lastIndex].percentage = parseFloat((100 - sumPctExceptLast).toFixed(2));
      newInsts[lastIndex].amount = parseFloat((simGrossTotal - sumAmtExceptLast).toFixed(2));
    }
    setInstallments(newInsts);
  };

  // 2. Calculations for Dashboard Overview (Admin Only)
  const totalRecebido = receivables
    .filter(r => r.status === 'received')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalAReceberVencer = receivables
    .filter(r => r.status === 'open' && new Date(r.due_date) >= new Date())
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalAReceberVencido = receivables
    .filter(r => r.status === 'open' && new Date(r.due_date) < new Date())
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalPago = payables
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalAPagar = payables
    .filter(p => p.status === 'open')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const saldoProjetado = totalRecebido + totalAReceberVencer + totalAReceberVencido - totalPago - totalAPagar;

  // 3. Seller Commissions Calculations (For Seller view)
  const sellerCommissions = commissions.filter(c => c.seller_id === user?.id);
  const totalSellerPrevista = sellerCommissions
    .filter(c => c.status === 'expected')
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);
  const totalSellerLiberada = sellerCommissions
    .filter(c => c.status === 'released')
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);
  const totalSellerPaga = sellerCommissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  // Business Action: Save a New Sale (or Update an existing one)
  const handleSaveSale = async (e) => {
    if (e) e.preventDefault();
    if (!newSale.customer_id) {
      alert('Selecione um cliente.');
      return;
    }

    // Role-based price minimum validation (R$ 1.100,00 per module)
    if (isBelowMinPrice) {
      if (!isUserAdmin) {
        alert(`Erro de Precificação Comercial: O preço equivalente por módulo eletrostático (${formatCurrency(simEquivalentPrice)}) está abaixo do preço mínimo de tabela de ${formatCurrency(NOZZLE_BASE_PRICE)} por módulo.\n\nVendedores não possuem permissão comercial para realizar vendas abaixo da tabela de engenharia.`);
        return;
      } else {
        const confirm = window.confirm(`Atenção Administrador: O preço equivalente por módulo eletrostático (${formatCurrency(simEquivalentPrice)}) está abaixo do preço mínimo de tabela de ${formatCurrency(NOZZLE_BASE_PRICE)} por módulo.\n\nDeseja forçar o override e registrar a venda mesmo assim?`);
        if (!confirm) return;
      }
    }

    // Installments percentage validation (Must be 100%)
    if (!isPercentValid) {
      alert(`Erro no Cronograma de Parcelas: A soma das parcelas é de ${totalPercentSum.toFixed(2)}%, mas deve somar exatamente 100.00% do total da venda.`);
      return;
    }

    try {
      setLoading(true);
      const sellerId = isUserAdmin ? (sellers[0]?.id || user.id) : user.id;
      const nozzles = Number(newSale.nozzles_count); // Electrostatic Modules

      const saleRecord = {
        customer_id: newSale.customer_id,
        seller_id: sellerId,
        sale_date: new Date().toISOString().split('T')[0],
        nozzles_count: nozzles,
        physical_nozzles_count: Number(newSale.physical_nozzles_count) || nozzles,
        boom_width_m: Number(newSale.boom_width_m) || 0,
        nozzle_spacing_cm: Number(newSale.nozzle_spacing_cm) || 50,
        pricing_mode: newSale.pricing_mode,
        price_per_nozzle: newSale.pricing_mode === 'per_nozzle' ? Number(newSale.price_per_nozzle) : 0,
        equivalent_price_per_nozzle: simEquivalentPrice,
        total_amount: simGrossTotal,
        discount_amount: 0,
        payment_terms: newSale.payment_terms,
        payment_method: newSale.payment_method,
        status: 'pending_billing',
        notes: newSale.notes || `Venda comercial do kit. Máquina com ${newSale.physical_nozzles_count} bicos reais, barra de ${newSale.boom_width_m}m, espaçamento de ${newSale.nozzle_spacing_cm}cm. Engenharia otimizou para ${nozzles} módulos isoladores eletrostáticos.`
      };

      let targetSaleId;

      if (editingSaleId) {
        // === UPDATE MODE: replace sale and regenerate installments/commissions ===
        await supabase.from('commissions').delete().eq('sale_id', editingSaleId);
        await supabase.from('accounts_receivable').delete().eq('sale_id', editingSaleId);
        await supabase.from('sales').update(saleRecord).eq('id', editingSaleId);
        targetSaleId = editingSaleId;
      } else {
        // === INSERT MODE: create new sale ===
        const { data: savedSaleData, error: saleErr } = await supabase.from('sales').insert(saleRecord).select();
        if (saleErr) throw saleErr;
        targetSaleId = savedSaleData[0].id;
      }

      // Generate Accounts Receivable installments from dynamic grid
      const newReceivables = installments.map((inst, index) => ({
        sale_id: targetSaleId,
        customer_id: newSale.customer_id,
        installment_number: index + 1,
        amount: inst.amount,
        due_date: inst.due_date,
        received_amount: 0,
        status: 'open',
        notes: `Parcela ${index + 1}/${installments.length} (${inst.label || 'Venda'}) da venda comercial.`
      }));

      // Generate Seller Commission installments (10% rate on liquidity)
      const newCommissions = installments.map((inst, index) => {
        const baseInstAmount = inst.amount * (1 - TAX_RATE);
        const commInstAmount = baseInstAmount * COMMISSION_RATE;
        return {
          sale_id: targetSaleId,
          seller_id: sellerId,
          commission_type: 'percentage',
          commission_rate: COMMISSION_RATE,
          base_amount: baseInstAmount,
          commission_amount: commInstAmount,
          status: 'expected',
          notes: `Comissão prevista para parcela ${index + 1}/${installments.length} (${inst.label || 'Venda'}).`
        };
      });

      await supabase.from('accounts_receivable').insert(newReceivables);
      await supabase.from('commissions').insert(newCommissions);

      const msg = editingSaleId
        ? 'Venda atualizada com sucesso! O cronograma de parcelas e comissões foi regenerado.'
        : 'Venda registrada com sucesso! O cronograma de parcelas e as comissões foram configurados de acordo com os prazos agrícolas.';
      alert(msg);

      setShowSaleModal(false);
      setEditingSaleId(null);
      
      // Reset Form State
      setNewSale({
        customer_id: '',
        pricing_mode: 'per_nozzle',
        physical_nozzles_count: 60,
        boom_width_m: 30,
        nozzle_spacing_cm: 50,
        nozzles_count: 60,
        price_per_nozzle: 1500,
        flat_rate_amount: 90000,
        payment_terms: '30_60_90',
        payment_method: 'Pix / Boleto',
        notes: ''
      });

      fetchFinancialData();
    } catch (err) {
      console.error('Erro ao salvar venda:', err);
      alert('Ocorreu um erro ao salvar a venda.');
    } finally {
      setLoading(false);
    }
  };

  // Business Action: Save a New Expense / Payable
  const handleSaveExpense = async (e) => {
    if (e) e.preventDefault();
    if (!newExpense.supplier_name || !newExpense.amount || !newExpense.due_date) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      const expenseRecord = {
        supplier_name: newExpense.supplier_name,
        description: newExpense.description || `Lançamento de despesa em ${newExpense.category}`,
        category: newExpense.category,
        amount: Number(newExpense.amount),
        due_date: newExpense.due_date,
        status: 'open',
        notes: newExpense.notes
      };

      const { error } = await supabase.from('accounts_payable').insert(expenseRecord);
      if (error) throw error;

      alert('Despesa operacional registrada com sucesso!');
      setShowExpenseModal(false);
      setNewExpense({
        supplier_name: '',
        description: '',
        category: 'Matéria-prima',
        amount: '',
        due_date: '',
        notes: ''
      });

      fetchFinancialData();
    } catch (err) {
      console.error('Erro ao cadastrar despesa:', err);
      alert('Erro ao registrar despesa.');
    } finally {
      setLoading(false);
    }
  };

  // Admin Action: Receive an installment (Confirms payment from client)
  const handleConfirmReceipt = async (receivable) => {
    try {
      setLoading(true);
      const updateData = {
        status: 'received',
        received_amount: receivable.amount,
        received_at: new Date().toISOString().split('T')[0],
        payment_method: 'Pix'
      };

      await supabase.from('accounts_receivable').update(updateData).eq('id', receivable.id);

      // Business automation: find the corresponding commission row and automatically change status to "released" (liberada para pagamento)!
      // The commission is linked to the same sale_id and seller_id. We can find the matching commission amount.
      const installmentBase = receivable.amount * (1 - TAX_RATE);
      const expectedCommAmount = installmentBase * COMMISSION_RATE;

      const matchedComm = commissions.find(
        c => c.sale_id === receivable.sale_id && 
             Math.abs(Number(c.commission_amount) - expectedCommAmount) < 0.1 && 
             c.status === 'expected'
      );

      if (matchedComm) {
        await supabase.from('commissions').update({ status: 'released', released_at: new Date().toISOString().split('T')[0] }).eq('id', matchedComm.id);
      }

      alert('Recebimento confirmado! Parcela marcada como recebida. A comissão proporcional correspondente foi automaticamente LIBERADA para o vendedor.');
      fetchFinancialData();
    } catch (err) {
      console.error('Erro ao confirmar recebimento:', err);
    } finally {
      setLoading(false);
    }
  };

  // Admin Action: Pay a payable (Expense / Vendor invoice)
  const handleConfirmPayable = async (payableId) => {
    try {
      setLoading(true);
      await supabase.from('accounts_payable').update({
        status: 'paid',
        paid_at: new Date().toISOString().split('T')[0]
      }).eq('id', payableId);

      alert('Despesa operacional baixada como Paga com sucesso!');
      fetchFinancialData();
    } catch (err) {
      console.error('Erro ao quitar despesa:', err);
    } finally {
      setLoading(false);
    }
  };

  // Business Action: Delete a Sale (cascade to receivables & commissions)
  const handleDeleteSale = async (saleId) => {
    // Safety check: block if any installment has been received
    const saleReceivables = receivables.filter(r => r.sale_id === saleId);
    const hasReceivedInstallment = saleReceivables.some(r => r.status === 'received');
    if (hasReceivedInstallment) {
      alert('Esta venda possui parcelas já recebidas e não pode ser excluída.\n\nEntre em contato com o administrador para fazer os ajustes necessários.');
      setDeleteConfirmSaleId(null);
      return;
    }

    try {
      setLoading(true);
      // Cascade delete: commissions → receivables → sale
      await supabase.from('commissions').delete().eq('sale_id', saleId);
      await supabase.from('accounts_receivable').delete().eq('sale_id', saleId);
      await supabase.from('sales').delete().eq('id', saleId);
      setDeleteConfirmSaleId(null);
      alert('Venda excluída com sucesso!');
      fetchFinancialData();
    } catch (err) {
      console.error('Erro ao excluir venda:', err);
      alert('Ocorreu um erro ao excluir a venda.');
    } finally {
      setLoading(false);
    }
  };

  // Business Action: Load a Sale into the form for editing
  const handleEditSale = (sale) => {
    // Safety check: block if any installment has been received
    const saleReceivables = receivables.filter(r => r.sale_id === sale.id);
    const hasReceivedInstallment = saleReceivables.some(r => r.status === 'received');
    if (hasReceivedInstallment) {
      alert('Esta venda possui parcelas já recebidas e não pode ser editada.\n\nEntre em contato com o administrador para fazer os ajustes necessários.');
      return;
    }

    // Load sale data into the form
    setEditingSaleId(sale.id);
    setNewSale({
      customer_id: sale.customer_id || '',
      pricing_mode: sale.pricing_mode || 'per_nozzle',
      physical_nozzles_count: sale.physical_nozzles_count || 60,
      boom_width_m: sale.boom_width_m || 30,
      nozzle_spacing_cm: sale.nozzle_spacing_cm || 50,
      nozzles_count: sale.nozzles_count || 60,
      price_per_nozzle: sale.price_per_nozzle || 1500,
      flat_rate_amount: sale.total_amount || 90000,
      payment_terms: sale.payment_terms || '30_60_90',
      payment_method: sale.payment_method || 'Pix / Boleto',
      notes: sale.notes || ''
    });

    // Rebuild installments from the existing receivables
    const linkedReceivables = receivables
      .filter(r => r.sale_id === sale.id)
      .sort((a, b) => a.installment_number - b.installment_number);

    if (linkedReceivables.length > 0) {
      const rebuiltInstallments = linkedReceivables.map((r, idx) => ({
        number: idx + 1,
        label: r.notes ? r.notes.replace(/^Parcela \d+\/\d+ \((.*)\).*$/, '$1') : `Parcela ${idx + 1}`,
        percentage: parseFloat(((r.amount / sale.total_amount) * 100).toFixed(2)),
        amount: r.amount,
        due_date: r.due_date,
        notes: r.notes || ''
      }));
      setInstallments(rebuiltInstallments);
    }

    setShowSaleModal(true);
  };

  // Admin Action: Approve / Release a Seller's Commission manually
  const handleReleaseCommission = async (commId) => {
    try {
      setLoading(true);
      await supabase.from('commissions').update({
        status: 'released',
        released_at: new Date().toISOString().split('T')[0]
      }).eq('id', commId);

      alert('Comissão liberada para pagamento!');
      fetchFinancialData();
    } catch (err) {
      console.error('Erro ao liberar comissão:', err);
    } finally {
      setLoading(false);
    }
  };

  // Admin Action: Mark a Seller's Commission as paid (Money sent to seller)
  const handlePayCommission = async (commission) => {
    try {
      setLoading(true);
      await supabase.from('commissions').update({
        status: 'paid',
        paid_at: new Date().toISOString().split('T')[0]
      }).eq('id', commission.id);

      // Business integration: Since company is paying a seller commission, we must automatically add this as an expense in "Contas a Pagar / Pagos" as corporate outflow!
      const sellerProfile = sellers.find(s => s.id === commission.seller_id);
      const sellerName = sellerProfile ? sellerProfile.full_name : 'Vendedor';

      const expenseRecord = {
        supplier_name: `Comissão - ${sellerName}`,
        description: `Pagamento de comissão referente à venda. ${commission.notes || ''}`,
        category: 'Comissão',
        amount: Number(commission.commission_amount),
        due_date: new Date().toISOString().split('T')[0],
        paid_at: new Date().toISOString().split('T')[0],
        status: 'paid',
        notes: `Quitado no financeiro.`
      };

      await supabase.from('accounts_payable').insert(expenseRecord);

      alert('Comissão marcada como paga! Um lançamento correspondente de saída foi adicionado ao Contas a Pagar quitados.');
      fetchFinancialData();
    } catch (err) {
      console.error('Erro ao pagar comissão:', err);
    } finally {
      setLoading(false);
    }
  };

  // Maps IDs to user/customer names
  const getCustomerName = (id) => {
    const cust = customers.find(c => c.id === id);
    return cust ? cust.name : 'Cliente Especial';
  };

  const getSellerName = (id) => {
    const seller = sellers.find(s => s.id === id);
    return seller ? seller.full_name : 'Marcos Vendedor';
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="finance-module">
      {/* Dynamic Navigation Tabs */}
      <div className="tab-navigation" style={{ marginBottom: '24px' }}>
        {isUserAdmin ? (
          <>
            <button 
              className={`tab-btn ${activeTab === 'fluxo' ? 'active' : ''}`}
              onClick={() => setActiveTab('fluxo')}
            >
              <TrendingUp size={16} /> Fluxo de Caixa
            </button>
            <button 
              className={`tab-btn ${activeTab === 'vendas' ? 'active' : ''}`}
              onClick={() => setActiveTab('vendas')}
            >
              <ShoppingBag size={16} /> Vendas
            </button>
            <button 
              className={`tab-btn ${activeTab === 'receber' ? 'active' : ''}`}
              onClick={() => setActiveTab('receber')}
            >
              <DollarSign size={16} /> Contas a Receber
            </button>
            <button 
              className={`tab-btn ${activeTab === 'pagar' ? 'active' : ''}`}
              onClick={() => setActiveTab('pagar')}
            >
              <TrendingDown size={16} /> Contas a Pagar
            </button>
            <button 
              className={`tab-btn ${activeTab === 'comissoes' ? 'active' : ''}`}
              onClick={() => setActiveTab('comissoes')}
            >
              <Percent size={16} /> Comissões Geral
            </button>
          </>
        ) : (
          <>
            <button 
              className={`tab-btn ${activeTab === 'simulador' ? 'active' : ''}`}
              onClick={() => setActiveTab('simulador')}
            >
              <Calculator size={16} /> Simulador de Vendas
            </button>
            <button 
              className={`tab-btn ${activeTab === 'minhas_vendas' ? 'active' : ''}`}
              onClick={() => setActiveTab('minhas_vendas')}
            >
              <ShoppingBag size={16} /> Minhas Vendas
            </button>
            <button 
              className={`tab-btn ${activeTab === 'minhas_comissoes' ? 'active' : ''}`}
              onClick={() => setActiveTab('minhas_comissoes')}
            >
              <DollarSign size={16} /> Meus Ganhos
            </button>
          </>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '24px', fontStyle: 'italic', color: 'var(--gray-500)' }}>
          Carregando dados financeiros... ⚙️
        </div>
      )}

      {!loading && (
        <>
          {/* ==================== ADMIN TAB: FLUXO DE CAIXA ==================== */}
          {isUserAdmin && activeTab === 'fluxo' && (
            <div>
              {/* Financial Dashboard Cards */}
              <div className="dashboard-grid">
                <div className="stat-card" style={{ borderLeft: '5px solid var(--status-won)' }}>
                  <div className="stat-icon" style={{ backgroundColor: 'var(--status-won-bg)', color: 'var(--status-won)' }}>
                    <TrendingUp size={22} />
                  </div>
                  <div>
                    <div className="stat-value" style={{ color: 'var(--status-won)', fontSize: '20px' }}>
                      {formatCurrency(totalRecebido)}
                    </div>
                    <div className="stat-label">Total Recebido (Entradas)</div>
                  </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '5px solid var(--status-scheduled)' }}>
                  <div className="stat-icon" style={{ backgroundColor: 'var(--status-scheduled-bg)', color: 'var(--status-scheduled)' }}>
                    <DollarSign size={22} />
                  </div>
                  <div>
                    <div className="stat-value" style={{ color: 'var(--status-scheduled)', fontSize: '20px' }}>
                      {formatCurrency(totalAReceberVencer)}
                    </div>
                    <div className="stat-label">Receber a Vencer</div>
                  </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '5px solid #f87171' }}>
                  <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>
                    <TrendingDown size={22} />
                  </div>
                  <div>
                    <div className="stat-value" style={{ color: '#ef4444', fontSize: '20px' }}>
                      {formatCurrency(totalAPagar)}
                    </div>
                    <div className="stat-label">Contas a Pagar</div>
                  </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '5px solid var(--primary)' }}>
                  <div className="stat-icon" style={{ backgroundColor: '#dcfce7', color: 'var(--primary)' }}>
                    <Layers size={22} />
                  </div>
                  <div>
                    <div className="stat-value" style={{ color: 'var(--primary)', fontSize: '20px' }}>
                      {formatCurrency(saldoProjetado)}
                    </div>
                    <div className="stat-label">Saldo Projetado Geral</div>
                  </div>
                </div>
              </div>

              {/* Alert for Overdue client installments */}
              {totalAReceberVencido > 0 && (
                <div className="glass-card flex align-center gap-3" style={{ borderLeft: '6px solid #f59e0b', marginBottom: '24px', backgroundColor: '#fffbeb' }}>
                  <AlertTriangle size={24} style={{ color: '#d97706' }} />
                  <div>
                    <strong style={{ color: '#92400e', fontSize: '15px' }}>Há Parcelas Atrasadas de Clientes!</strong>
                    <p style={{ color: '#b45309', fontSize: '13px', margin: 0 }}>
                      Existem recebíveis vencidos somando {formatCurrency(totalAReceberVencido)}. Acesse a aba de Recebíveis para cobrar.
                    </p>
                  </div>
                </div>
              )}

              {/* General cash movements */}
              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {/* Recent Receivables Installments */}
                <div className="card">
                  <div className="flex justify-between align-center" style={{ marginBottom: '16px' }}>
                    <h3>Próximas Contas a Receber</h3>
                    <button className="tab-btn" onClick={() => setActiveTab('receber')} style={{ fontSize: '12px', padding: 0 }}>Ver todas</button>
                  </div>

                  <div className="mobile-card-list">
                    {receivables.slice(0, 4).map(r => (
                      <div key={r.id} className="mobile-card" style={{ padding: '12px' }}>
                        <div className="flex justify-between align-center">
                          <span style={{ fontWeight: 700, fontSize: '13px' }}>{getCustomerName(r.customer_id)}</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: r.status === 'received' ? 'var(--status-won)' : 'var(--status-scheduled)' }}>
                            {formatCurrency(r.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between align-center" style={{ marginTop: '8px', fontSize: '12px', color: 'var(--gray-500)' }}>
                          <span>Parc. {r.installment_number}</span>
                          <span>Venc: {formatDate(r.due_date)}</span>
                          <span className={`status-badge status-${r.status}`} style={{ transform: 'scale(0.85)' }}>
                            {r.status === 'received' ? 'Recebido' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Accounts Payables */}
                <div className="card">
                  <div className="flex justify-between align-center" style={{ marginBottom: '16px' }}>
                    <h3>Próximos Pagamentos (Saídas)</h3>
                    <button className="tab-btn" onClick={() => setActiveTab('pagar')} style={{ fontSize: '12px', padding: 0 }}>Ver todos</button>
                  </div>

                  <div className="mobile-card-list">
                    {payables.slice(0, 4).map(p => (
                      <div key={p.id} className="mobile-card" style={{ padding: '12px' }}>
                        <div className="flex justify-between align-center">
                          <span style={{ fontWeight: 700, fontSize: '13px' }}>{p.supplier_name}</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>
                            {formatCurrency(p.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between align-center" style={{ marginTop: '8px', fontSize: '12px', color: 'var(--gray-500)' }}>
                          <span>Cat: {p.category}</span>
                          <span>Venc: {formatDate(p.due_date)}</span>
                          <span className={`status-badge status-${p.status}`} style={{ transform: 'scale(0.85)', backgroundColor: p.status === 'paid' ? '#dcfce7' : '#fee2e2', color: p.status === 'paid' ? 'var(--primary)' : '#ef4444' }}>
                            {p.status === 'paid' ? 'Pago' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== ADMIN TAB: CONTAS A RECEBER ==================== */}
          {isUserAdmin && activeTab === 'receber' && (
            <div>
              <div className="flex justify-between align-center" style={{ marginBottom: '16px' }}>
                <h2>Contas a Receber (Vendas de Clientes)</h2>
                <button className="btn btn-primary" onClick={() => setShowSaleModal(true)}>
                  <Plus size={16} /> Nova Venda
                </button>
              </div>

              {receivables.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '24px' }}>Nenhum recebível cadastrado.</p>
              ) : (
                <div className="mobile-card-list">
                  {receivables.map(r => {
                    const isOverdue = r.status === 'open' && new Date(r.due_date) < new Date();
                    return (
                      <div key={r.id} className="mobile-card" style={{ borderLeft: `4px solid ${r.status === 'received' ? 'var(--status-won)' : isOverdue ? '#ef4444' : 'var(--status-scheduled)'}` }}>
                        <div className="flex justify-between align-center">
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '15px', display: 'block' }}>
                              {getCustomerName(r.customer_id)}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                              Venda vinculada • Parcela {r.installment_number}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px', display: 'block', color: 'var(--gray-800)' }}>
                              {formatCurrency(r.amount)}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: r.status === 'received' ? 'var(--status-won)' : isOverdue ? '#ef4444' : 'var(--status-scheduled)' }}>
                              Venc: {formatDate(r.due_date)}
                            </span>
                          </div>
                        </div>

                        {r.notes && (
                          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--gray-600)', fontStyle: 'italic' }}>
                            Nota: {r.notes}
                          </p>
                        )}

                        <div className="flex justify-between align-center" style={{ marginTop: '12px', borderTop: '1px solid var(--gray-100)', paddingTop: '10px' }}>
                          <span className={`status-badge status-${r.status}`} style={{ backgroundColor: r.status === 'received' ? 'var(--status-won-bg)' : isOverdue ? '#fee2e2' : 'var(--status-scheduled-bg)', color: r.status === 'received' ? 'var(--status-won)' : isOverdue ? '#ef4444' : 'var(--status-scheduled)' }}>
                            {r.status === 'received' ? 'Recebido' : isOverdue ? 'Atrasado' : 'Aberto'}
                          </span>

                          {r.status === 'open' && (
                            <button 
                              className="btn" 
                              onClick={() => handleConfirmReceipt(r)}
                              style={{ padding: '6px 12px', fontSize: '12px', height: 'auto', backgroundColor: '#e2f0d9', color: '#385723', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Check size={14} /> Confirmar Pix/Boleto
                            </button>
                          )}
                          {r.status === 'received' && r.received_at && (
                            <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                              Recebido em {formatDate(r.received_at)} ({r.payment_method})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== ADMIN TAB: CONTAS A PAGAR ==================== */}
          {isUserAdmin && activeTab === 'pagar' && (
            <div>
              <div className="flex justify-between align-center" style={{ marginBottom: '16px' }}>
                <h2>Contas a Pagar (Despesas & Insumos)</h2>
                <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)} style={{ backgroundColor: '#ef4444' }}>
                  <Plus size={16} /> Nova Despesa
                </button>
              </div>

              {payables.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '24px' }}>Nenhuma despesa operacional cadastrada.</p>
              ) : (
                <div className="mobile-card-list">
                  {payables.map(p => (
                    <div key={p.id} className="mobile-card" style={{ borderLeft: `4px solid ${p.status === 'paid' ? 'var(--primary)' : '#ef4444'}` }}>
                      <div className="flex justify-between align-center">
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '15px', display: 'block' }}>
                            {p.supplier_name}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                            Categoria: {p.category} • {p.description}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, fontSize: '15px', display: 'block', color: '#ef4444' }}>
                            {formatCurrency(p.amount)}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: p.status === 'paid' ? 'var(--primary)' : '#ef4444' }}>
                            Venc: {formatDate(p.due_date)}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between align-center" style={{ marginTop: '12px', borderTop: '1px solid var(--gray-100)', paddingTop: '10px' }}>
                        <span className={`status-badge status-${p.status}`} style={{ backgroundColor: p.status === 'paid' ? '#dcfce7' : '#fee2e2', color: p.status === 'paid' ? 'var(--primary)' : '#ef4444' }}>
                          {p.status === 'paid' ? 'Pago' : 'Em Aberto'}
                        </span>

                        {p.status === 'open' && (
                          <button 
                            className="btn" 
                            onClick={() => handleConfirmPayable(p.id)}
                            style={{ padding: '6px 12px', fontSize: '12px', height: 'auto', backgroundColor: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Check size={14} /> Confirmar Saída
                          </button>
                        )}
                        {p.status === 'paid' && p.paid_at && (
                          <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                            Quitado em {formatDate(p.paid_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== ADMIN TAB: CONTROLE GERAL DE COMISSÕES ==================== */}
          {isUserAdmin && activeTab === 'comissoes' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h2>Controle Consolidado de Comissões de Vendas</h2>
                <p style={{ color: 'var(--gray-500)', fontSize: '13px' }}>
                  Monitore e libere os pagamentos de comissão para a equipe comercial baseados na quitação dos clientes.
                </p>
              </div>

              {commissions.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '24px' }}>Nenhuma comissão comercial gerada.</p>
              ) : (
                <div className="mobile-card-list">
                  {commissions.map(c => (
                    <div key={c.id} className="mobile-card">
                      <div className="flex justify-between align-center">
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={16} className="text-primary" /> {getSellerName(c.seller_id)}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                            Base faturamento líquido: {formatCurrency(c.base_amount)} (Imp. descontados)
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--status-won)' }}>
                            {formatCurrency(c.commission_amount)}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                            Taxa: 10%
                          </span>
                        </div>
                      </div>

                      <p style={{ margin: '8px 0', fontSize: '12px', color: 'var(--gray-600)', fontStyle: 'italic' }}>
                        Detalhamento: {c.notes}
                      </p>

                      <div className="flex justify-between align-center" style={{ marginTop: '12px', borderTop: '1px solid var(--gray-100)', paddingTop: '10px' }}>
                        <span className={`status-badge status-${c.status}`}>
                          {c.status === 'expected' ? 'Prevista' : c.status === 'released' ? 'Liberada' : 'Paga'}
                        </span>

                        <div className="flex gap-2">
                          {c.status === 'expected' && (
                            <button 
                              className="btn" 
                              onClick={() => handleReleaseCommission(c.id)}
                              style={{ padding: '4px 10px', fontSize: '11px', height: 'auto', backgroundColor: '#fffbeb', color: '#b45309' }}
                            >
                              Liberar Manual
                            </button>
                          )}
                          {c.status === 'released' && (
                            <button 
                              className="btn btn-primary" 
                              onClick={() => handlePayCommission(c)}
                              style={{ padding: '4px 10px', fontSize: '11px', height: 'auto' }}
                            >
                              Registrar Pagamento
                            </button>
                          )}
                          {c.status === 'paid' && c.paid_at && (
                            <span style={{ fontSize: '11px', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <UserCheck size={12} /> Pago em {formatDate(c.paid_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== ADMIN TAB: VENDAS ==================== */}
          {isUserAdmin && activeTab === 'vendas' && (
            <div>
              <div className="flex justify-between align-center" style={{ marginBottom: '16px' }}>
                <h2>Histórico de Vendas Comerciais</h2>
                <button className="btn btn-primary" onClick={() => { setEditingSaleId(null); setShowSaleModal(true); }}>
                  <Plus size={16} /> Nova Venda
                </button>
              </div>

              {sales.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '24px' }}>Nenhuma venda registrada.</p>
              ) : (
                <div className="mobile-card-list">
                  {sales.map(sale => {
                    const saleReceivables = receivables.filter(r => r.sale_id === sale.id);
                    const hasReceived = saleReceivables.some(r => r.status === 'received');
                    const isEditable = !hasReceived;
                    const isConfirmingDelete = deleteConfirmSaleId === sale.id;
                    return (
                      <div key={sale.id} className="mobile-card" style={{ borderLeft: `4px solid ${hasReceived ? 'var(--status-won)' : 'var(--primary)'}` }}>
                        <div className="flex justify-between align-center">
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '15px', display: 'block' }}>
                              {getCustomerName(sale.customer_id)}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                              {getSellerName(sale.seller_id)} • {formatDate(sale.sale_date)} • {sale.physical_nozzles_count} bicos / {sale.boom_width_m}m barra / {sale.nozzle_spacing_cm}cm espaç.
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--primary)', display: 'block' }}>
                              {formatCurrency(sale.total_amount)}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                              {sale.pricing_mode === 'per_nozzle' ? `${sale.nozzles_count} módulos × ${formatCurrency(sale.price_per_nozzle)}` : 'Porteira Fechada'}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between align-center" style={{ marginTop: '12px', borderTop: '1px solid var(--gray-100)', paddingTop: '10px' }}>
                          <div className="flex align-center gap-2">
                            <span className="status-badge" style={{ backgroundColor: hasReceived ? 'var(--status-won-bg)' : '#f0fdf4', color: hasReceived ? 'var(--status-won)' : 'var(--primary)', fontSize: '11px' }}>
                              {hasReceived ? 'Parcialmente/Total Recebido' : 'Em Aberto'}
                            </span>
                            {!isEditable && (
                              <span style={{ fontSize: '11px', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Lock size={11} /> Protegida
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {isEditable && !isConfirmingDelete && (
                              <button
                                className="btn"
                                onClick={() => handleEditSale(sale)}
                                style={{ padding: '5px 10px', fontSize: '12px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                              >
                                <Edit2 size={13} /> Editar
                              </button>
                            )}
                            {isEditable && !isConfirmingDelete && (
                              <button
                                className="btn"
                                onClick={() => setDeleteConfirmSaleId(sale.id)}
                                style={{ padding: '5px 10px', fontSize: '12px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
                              >
                                <Trash2 size={13} /> Excluir
                              </button>
                            )}
                            {isConfirmingDelete && (
                              <div className="flex gap-2 align-center" style={{ backgroundColor: '#fff7ed', padding: '6px 10px', borderRadius: 'var(--radius)', border: '1px solid #fed7aa' }}>
                                <span style={{ fontSize: '12px', color: '#c2410c', fontWeight: 600 }}>Confirmar exclusão?</span>
                                <button
                                  className="btn"
                                  onClick={() => handleDeleteSale(sale.id)}
                                  style={{ padding: '4px 10px', fontSize: '12px', height: 'auto', backgroundColor: '#ef4444', color: '#fff', border: 'none' }}
                                >
                                  Sim, Excluir
                                </button>
                                <button
                                  className="btn"
                                  onClick={() => setDeleteConfirmSaleId(null)}
                                  style={{ padding: '4px 10px', fontSize: '12px', height: 'auto', backgroundColor: 'var(--gray-200)', color: 'var(--gray-700)', border: 'none' }}
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                            {!isEditable && (
                              <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>Contate o Admin para alterações</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== SELLER TAB: MINHAS VENDAS ==================== */}
          {!isUserAdmin && activeTab === 'minhas_vendas' && (
            <div>
              <div className="flex justify-between align-center" style={{ marginBottom: '16px' }}>
                <div>
                  <h2>Minhas Vendas Comerciais</h2>
                  <p style={{ color: 'var(--gray-500)', fontSize: '12px', margin: '2px 0 0' }}>
                    Você pode editar ou excluir vendas desde que nenhuma parcela tenha sido recebida.
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditingSaleId(null); setShowSaleModal(true); }}>
                  <Plus size={16} /> Nova Venda
                </button>
              </div>

              {sales.filter(s => s.seller_id === user?.id).length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '24px' }}>Você ainda não registrou nenhuma venda.</p>
              ) : (
                <div className="mobile-card-list">
                  {sales.filter(s => s.seller_id === user?.id).map(sale => {
                    const saleReceivables = receivables.filter(r => r.sale_id === sale.id);
                    const hasReceived = saleReceivables.some(r => r.status === 'received');
                    const isEditable = !hasReceived;
                    const isConfirmingDelete = deleteConfirmSaleId === sale.id;
                    return (
                      <div key={sale.id} className="mobile-card" style={{ borderLeft: `4px solid ${hasReceived ? 'var(--status-won)' : 'var(--primary)'}` }}>
                        <div className="flex justify-between align-center">
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '15px', display: 'block' }}>
                              {getCustomerName(sale.customer_id)}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                              {formatDate(sale.sale_date)} • {sale.physical_nozzles_count} bicos reais / {sale.boom_width_m}m barra
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--primary)', display: 'block' }}>
                              {formatCurrency(sale.total_amount)}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                              {sale.pricing_mode === 'per_nozzle' ? `${sale.nozzles_count} módulos × ${formatCurrency(sale.price_per_nozzle)}` : 'Porteira Fechada'}
                            </span>
                          </div>
                        </div>

                        {/* Installments quick summary */}
                        {saleReceivables.length > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {saleReceivables.map(r => (
                              <span key={r.id} style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '12px', backgroundColor: r.status === 'received' ? '#dcfce7' : '#f1f5f9', color: r.status === 'received' ? 'var(--status-won)' : 'var(--gray-600)', border: '1px solid', borderColor: r.status === 'received' ? '#bbf7d0' : '#e2e8f0' }}>
                                Parc.{r.installment_number} {formatCurrency(r.amount)} {r.status === 'received' ? '✓' : `(${formatDate(r.due_date)})`}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-between align-center" style={{ marginTop: '12px', borderTop: '1px solid var(--gray-100)', paddingTop: '10px' }}>
                          <div className="flex align-center gap-2">
                            {!isEditable ? (
                              <span style={{ fontSize: '12px', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Lock size={13} /> Parcela recebida — Entre em contato com o admin para alterações.
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                ✔ Editável
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {isEditable && !isConfirmingDelete && (
                              <button
                                className="btn"
                                onClick={() => handleEditSale(sale)}
                                style={{ padding: '5px 10px', fontSize: '12px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                              >
                                <Edit2 size={13} /> Editar
                              </button>
                            )}
                            {isEditable && !isConfirmingDelete && (
                              <button
                                className="btn"
                                onClick={() => setDeleteConfirmSaleId(sale.id)}
                                style={{ padding: '5px 10px', fontSize: '12px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
                              >
                                <Trash2 size={13} /> Excluir
                              </button>
                            )}
                            {isConfirmingDelete && (
                              <div className="flex gap-2 align-center" style={{ backgroundColor: '#fff7ed', padding: '6px 10px', borderRadius: 'var(--radius)', border: '1px solid #fed7aa' }}>
                                <span style={{ fontSize: '12px', color: '#c2410c', fontWeight: 600 }}>Confirmar exclusão?</span>
                                <button
                                  className="btn"
                                  onClick={() => handleDeleteSale(sale.id)}
                                  style={{ padding: '4px 10px', fontSize: '12px', height: 'auto', backgroundColor: '#ef4444', color: '#fff', border: 'none' }}
                                >
                                  Sim, Excluir
                                </button>
                                <button
                                  className="btn"
                                  onClick={() => setDeleteConfirmSaleId(null)}
                                  style={{ padding: '4px 10px', fontSize: '12px', height: 'auto', backgroundColor: 'var(--gray-200)', color: 'var(--gray-700)', border: 'none' }}
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== SELLER TAB: SIMULADOR DE VENDAS ==================== */}
          {!isUserAdmin && activeTab === 'simulador' && (
            <div>
              {/* Simulator Card Intro */}
              <div className="glass-card" style={{ marginBottom: '24px', borderLeft: '6px solid var(--primary)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                  <Calculator className="text-primary" /> Simulador de Vendas & Cronograma Agrícola 🌾
                </h2>
                <p style={{ color: 'var(--gray-600)', fontSize: '14px', margin: 0 }}>
                  Gere orçamentos e simule comissões. Defina se a venda será <strong>Por Bico Eletrostático</strong> ou <strong>Porteira Fechada</strong>, configure as especificações da barra e parcele de acordo com a <strong>Safra & Safrinha</strong> do cliente.
                </p>
              </div>

              <div className="grid gap-4" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
                {/* Form Parameters */}
                <div className="card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '20px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} className="text-primary" /> Engenharia & Comercial do Kit
                  </h3>
                  
                  <form onSubmit={handleSaveSale}>
                    {/* Cliente */}
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label htmlFor="simCustomer" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--gray-750)' }}>
                        Cliente Comprador *
                      </label>
                      <select 
                        id="simCustomer"
                        className="form-control"
                        required
                        value={newSale.customer_id}
                        onChange={(e) => setNewSale({ ...newSale, customer_id: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', backgroundColor: '#fff' }}
                      >
                        <option value="">-- Selecione o Cliente --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.city}/{c.state})</option>
                        ))}
                      </select>
                    </div>

                    {/* Mode Toggle Tabs */}
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--gray-750)' }}>
                        Modo de Precificação *
                      </label>
                      <div className="flex gap-2" style={{ backgroundColor: 'var(--gray-100)', padding: '4px', borderRadius: 'var(--radius)' }}>
                        <button
                          type="button"
                          className="flex-1"
                          onClick={() => setNewSale(prev => ({ ...prev, pricing_mode: 'per_nozzle' }))}
                          style={{
                            padding: '8px',
                            borderRadius: 'calc(var(--radius) - 2px)',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: newSale.pricing_mode === 'per_nozzle' ? '#fff' : 'transparent',
                            color: newSale.pricing_mode === 'per_nozzle' ? 'var(--primary)' : 'var(--gray-600)',
                            boxShadow: newSale.pricing_mode === 'per_nozzle' ? 'var(--shadow-sm)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Calcular por Bico Eletrostático
                        </button>
                        <button
                          type="button"
                          className="flex-1"
                          onClick={() => setNewSale(prev => ({ ...prev, pricing_mode: 'flat_rate' }))}
                          style={{
                            padding: '8px',
                            borderRadius: 'calc(var(--radius) - 2px)',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: newSale.pricing_mode === 'flat_rate' ? '#fff' : 'transparent',
                            color: newSale.pricing_mode === 'flat_rate' ? 'var(--primary)' : 'var(--gray-600)',
                            boxShadow: newSale.pricing_mode === 'flat_rate' ? 'var(--shadow-sm)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Valor Geral Fechado
                        </button>
                      </div>
                    </div>

                    {/* Technical Machine Specification Cards */}
                    <div style={{ backgroundColor: 'var(--gray-50)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '13px', color: 'var(--gray-700)', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Especificações Técnicas da Máquina
                      </h4>
                      
                      <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div className="form-group">
                          <label htmlFor="simBoomWidth" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                            Comprimento da Barra (m)
                          </label>
                          <input 
                            id="simBoomWidth"
                            type="number"
                            className="form-control"
                            min="1"
                            value={newSale.boom_width_m}
                            onChange={(e) => setNewSale({ ...newSale, boom_width_m: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="simSpacing" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                            Espaçamento entre Bicos
                          </label>
                          <select 
                            id="simSpacing"
                            className="form-control"
                            value={newSale.nozzle_spacing_cm}
                            onChange={(e) => setNewSale({ ...newSale, nozzle_spacing_cm: Number(e.target.value) })}
                            style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', backgroundColor: '#fff' }}
                          >
                            <option value="50">50 cm (Padrão)</option>
                            <option value="35">35 cm (Adensado)</option>
                            <option value="45">45 cm</option>
                            <option value="38">38 cm</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label htmlFor="simPhysicalNozzles" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                            Bicos Reais da Máquina *
                          </label>
                          <input 
                            id="simPhysicalNozzles"
                            type="number"
                            className="form-control"
                            required
                            min="1"
                            value={newSale.physical_nozzles_count}
                            onChange={(e) => setNewSale({ ...newSale, physical_nozzles_count: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="simNozzles" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                            Módulos Eletrostáticos *
                          </label>
                          <input 
                            id="simNozzles"
                            type="number"
                            className="form-control"
                            required
                            min="1"
                            value={newSale.nozzles_count}
                            onChange={(e) => setNewSale({ ...newSale, nozzles_count: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', fontWeight: 700 }}
                          />
                        </div>
                      </div>

                      {/* Educational Spacing sharing reminder box */}
                      {Number(newSale.nozzle_spacing_cm) === 35 && (
                        <div className="flex gap-2" style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius)', padding: '10px', marginTop: '12px', fontSize: '11px', color: '#065f46', lineHeight: 1.4 }}>
                          <span>💡</span>
                          <span>
                            <strong>Otimização por Espaçamento (35cm):</strong> Em barras de 35cm, a engenharia permite compartilhar <strong>1 módulo isolador eletrostático para cada 2 bicos físicos</strong>. O sistema sugeriu automaticamente {Math.ceil(Number(newSale.physical_nozzles_count) / 2)} módulos isoladores, o que reduz substancialmente o custo final para o cliente mantendo a eficácia eletrostática!
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Pricing Inputs */}
                    {newSale.pricing_mode === 'per_nozzle' ? (
                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label htmlFor="simPrice" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--gray-750)' }}>
                          Preço Praticado por Módulo Eletrostático (R$) *
                        </label>
                        <input 
                          id="simPrice"
                          type="number"
                          className="form-control"
                          required
                          min="1"
                          value={newSale.price_per_nozzle}
                          onChange={(e) => setNewSale({ ...newSale, price_per_nozzle: e.target.value })}
                          style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', borderColor: isBelowMinPrice ? '#ef4444' : 'var(--gray-200)' }}
                        />
                        <div className="flex justify-between align-center" style={{ marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                            Tabela Mínima: R$ {NOZZLE_BASE_PRICE} / bico eletrostático.
                          </span>
                          {isBelowMinPrice && (
                            <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <ShieldAlert size={12} /> Preço abaixo de tabela!
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label htmlFor="simFlatRate" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--gray-750)' }}>
                          Valor Geral do Kit Comercial (R$ "Porteira Fechada") *
                        </label>
                        <input 
                          id="simFlatRate"
                          type="number"
                          className="form-control"
                          required
                          min="1"
                          value={newSale.flat_rate_amount}
                          onChange={(e) => setNewSale({ ...newSale, flat_rate_amount: e.target.value })}
                          style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', borderColor: isBelowMinPrice ? '#ef4444' : 'var(--gray-200)' }}
                        />
                        <div className="flex justify-between align-center" style={{ marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                            Equivalente: {formatCurrency(simEquivalentPrice)} por módulo isolador.
                          </span>
                          {isBelowMinPrice && (
                            <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <ShieldAlert size={12} /> Equivalente abaixo do mínimo!
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Agricultural Payment Terms Selector */}
                    <div className="grid gap-2" style={{ gridTemplateColumns: '1.2fr 1fr', marginBottom: '16px' }}>
                      <div className="form-group">
                        <label htmlFor="simTerms" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--gray-750)' }}>
                          Condições / Fluxo de Caixa
                        </label>
                        <select
                          id="simTerms"
                          className="form-control"
                          value={newSale.payment_terms}
                          onChange={(e) => setNewSale({ ...newSale, payment_terms: e.target.value })}
                          style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', backgroundColor: '#fff' }}
                        >
                          <option value="1x">À Vista (1x)</option>
                          <option value="30_60">30/60 Dias (2x)</option>
                          <option value="30_60_90">30/60/90 Dias (3x)</option>
                          <option value="entrada_safra_marco">Entrada + Safra (30/03)</option>
                          <option value="entrada_safra_abril">Entrada + Safra (30/04)</option>
                          <option value="entrada_safra_safrinha_marco_junho">Entrada + Safra (30/03) + Safrinha (30/06)</option>
                          <option value="entrada_safra_safrinha_abril_junho">Entrada + Safra (30/04) + Safrinha (30/06)</option>
                          <option value="entrada_safra_safrinha_abril_julho">Entrada + Safra (30/04) + Safrinha (30/07)</option>
                          <option value="customizado">Personalizado (Manual)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="simMethod" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--gray-750)' }}>
                          Forma de Pagamento
                        </label>
                        <input
                          id="simMethod"
                          type="text"
                          className="form-control"
                          value={newSale.payment_method}
                          onChange={(e) => setNewSale({ ...newSale, payment_method: e.target.value })}
                          style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}
                        />
                      </div>
                    </div>

                    {/* DYNAMIC CROP INSTALLMENTS TABLE EDITOR */}
                    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '16px', backgroundColor: '#fff', marginBottom: '20px' }}>
                      <div className="flex justify-between align-center" style={{ marginBottom: '12px' }}>
                        <h4 style={{ fontSize: '13px', color: 'var(--gray-750)', fontWeight: 700, margin: 0 }}>
                          Cronograma de Parcelas Agrícola
                        </h4>
                        <button
                          type="button"
                          className="btn"
                          onClick={addInstallment}
                          style={{ padding: '4px 8px', fontSize: '11px', height: 'auto', display: 'flex', alignItems: 'center', gap: '3px', border: '1px dashed var(--primary)', color: 'var(--primary)', backgroundColor: '#f0fdf4' }}
                        >
                          <Plus size={12} /> Add Parcela
                        </button>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '400px' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid var(--gray-150)', textAlign: 'left', color: 'var(--gray-500)' }}>
                              <th style={{ padding: '6px 4px' }}>Parcela</th>
                              <th style={{ padding: '6px 4px' }}>Vencimento</th>
                              <th style={{ padding: '6px 4px', width: '70px' }}>%</th>
                              <th style={{ padding: '6px 4px', width: '100px' }}>Valor (R$)</th>
                              <th style={{ padding: '6px 4px', width: '40px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {installments.map((inst, index) => (
                              <tr key={index} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                                <td style={{ padding: '6px 4px' }}>
                                  <input 
                                    type="text"
                                    value={inst.label}
                                    onChange={(e) => handleInstallmentLabelChange(index, e.target.value)}
                                    style={{ width: '100%', padding: '4px 6px', fontSize: '12px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)' }}
                                  />
                                </td>
                                <td style={{ padding: '6px 4px' }}>
                                  <input 
                                    type="date"
                                    value={inst.due_date}
                                    onChange={(e) => handleInstallmentDateChange(index, e.target.value)}
                                    style={{ width: '100%', padding: '4px 6px', fontSize: '12px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)' }}
                                  />
                                </td>
                                <td style={{ padding: '6px 4px' }}>
                                  <input 
                                    type="number"
                                    step="0.01"
                                    value={inst.percentage}
                                    onChange={(e) => handleInstallmentPercentChange(index, e.target.value)}
                                    style={{ width: '100%', padding: '4px 6px', fontSize: '12px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)' }}
                                  />
                                </td>
                                <td style={{ padding: '6px 4px' }}>
                                  <input 
                                    type="number"
                                    step="0.01"
                                    value={inst.amount}
                                    onChange={(e) => handleInstallmentAmountChange(index, e.target.value)}
                                    style={{ width: '100%', padding: '4px 6px', fontSize: '12px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)' }}
                                  />
                                </td>
                                <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    disabled={installments.length <= 1}
                                    onClick={() => removeInstallment(index)}
                                    style={{ border: 'none', background: 'none', color: '#ef4444', cursor: installments.length <= 1 ? 'not-allowed' : 'pointer', opacity: installments.length <= 1 ? 0.3 : 1 }}
                                  >
                                    &times;
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Installments Table Controls & Warning Alerts */}
                      <div className="flex justify-between align-center" style={{ marginTop: '12px', fontSize: '12px', borderTop: '1px solid var(--gray-150)', paddingTop: '8px' }}>
                        <div>
                          <span style={{ marginRight: '10px' }}>Total: <strong style={{ color: isPercentValid ? 'var(--primary)' : '#ef4444' }}>{totalPercentSum.toFixed(2)}%</strong></span>
                          <span>Faturado: <strong style={{ color: isAmountValid ? 'var(--primary)' : '#ef4444' }}>{formatCurrency(totalAmountSum)}</strong></span>
                        </div>
                        <button
                          type="button"
                          onClick={autoAdjustLastInstallment}
                          className="btn"
                          style={{ padding: '3px 8px', fontSize: '10px', height: 'auto', backgroundColor: 'var(--gray-200)', color: 'var(--gray-700)' }}
                        >
                          Ajustar Última Parcela
                        </button>
                      </div>

                      {!isPercentValid && (
                        <div style={{ backgroundColor: '#fffbe5', color: '#8a6d1c', border: '1px solid #f2e1a3', fontSize: '11px', padding: '8px', borderRadius: 'var(--radius)', marginTop: '8px' }}>
                          ⚠️ A soma das porcentagens deve ser exatamente <strong>100%</strong> (atual: {totalPercentSum.toFixed(2)}%). Por favor clique em "Ajustar Última Parcela" ou reequilibre os percentuais antes de salvar.
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label htmlFor="simNotes" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--gray-750)' }}>
                        Observações Técnicas / Comerciais
                      </label>
                      <textarea
                        id="simNotes"
                        rows="2"
                        className="form-control"
                        placeholder="Ex: Entregar com isolador para bico JD. Pagamento com vencimento atrelado à safra de grãos..."
                        value={newSale.notes}
                        onChange={(e) => setNewSale({ ...newSale, notes: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', resize: 'vertical' }}
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ width: '100%', padding: '12px', fontWeight: 700 }}
                      disabled={!isPercentValid}
                    >
                      Gravar Venda Comercial
                    </button>
                  </form>
                </div>

                {/* Calculation Outputs */}
                <div className="card" style={{ padding: '24px', backgroundColor: 'var(--gray-50)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--gray-200)' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', marginBottom: '20px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calculator size={18} className="text-primary" /> Faturamento e Rentabilidade
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="flex justify-between" style={{ fontSize: '14px' }}>
                        <span style={{ color: 'var(--gray-500)' }}>Custo Base de Engenharia:</span>
                        <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{formatCurrency(simMinTotal)}</span>
                      </div>

                      <div className="flex justify-between" style={{ fontSize: '14px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '10px' }}>
                        <span style={{ color: 'var(--gray-500)' }}>Faturamento Comercial Bruto:</span>
                        <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--primary)' }}>
                          {formatCurrency(simGrossTotal)}
                        </span>
                      </div>

                      <div className="flex justify-between" style={{ fontSize: '14px', color: '#ef4444' }}>
                        <span>(-) Imposto Est. Faturamento (10%):</span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(simTaxes)}</span>
                      </div>

                      <div className="flex justify-between" style={{ fontSize: '14px', fontWeight: 600, borderBottom: '1px solid var(--gray-200)', paddingBottom: '10px', color: 'var(--gray-800)' }}>
                        <span>(=) Valor Líquido Base:</span>
                        <span style={{ fontWeight: 700 }}>{formatCurrency(simNetTotal)}</span>
                      </div>

                      {/* Display breakdown of generated installments schedule */}
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                          Cronograma Agrícola de Recebíveis
                        </span>
                        <div className="flex flex-col gap-2">
                          {installments.map((inst, index) => (
                            <div key={index} className="flex justify-between align-center" style={{ padding: '8px 10px', backgroundColor: '#fff', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: '12px' }}>
                              <div>
                                <span style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{inst.label || `Parc. ${inst.number}`}</span>
                                <span style={{ fontSize: '10px', color: 'var(--gray-400)', display: 'block' }}>Venc: {formatDate(inst.due_date)}</span>
                              </div>
                              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(inst.amount)} <span style={{ fontSize: '10px', color: 'var(--gray-400)', fontWeight: 400 }}>({inst.percentage}%)</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gigantic Highlight of Seller Commission Earnings */}
                  <div style={{ marginTop: '24px', backgroundColor: '#e6f4ea', border: '1px solid var(--status-won-bg)', borderRadius: 'var(--radius-lg)', padding: '20px', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#137333', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Sua Comissão Final Estimada (10%)
                    </span>
                    <h2 style={{ fontSize: '36px', color: 'var(--status-won)', margin: '8px 0', fontWeight: 800 }}>
                      {formatCurrency(simCommission)}
                    </h2>
                    <p style={{ color: '#137333', fontSize: '11px', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
                      "Incide sobre o valor líquido faturado pela empresa (após desconto padrão de imposto de nota fiscal direta de fábrica)."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SELLER TAB: MEUS GANHOS DE COMISSÃO ==================== */}
          {!isUserAdmin && activeTab === 'minhas_comissoes' && (
            <div>
              {/* Sellers Personal Indicators */}
              <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card" style={{ borderLeft: '5px solid var(--status-scheduled)' }}>
                  <div className="stat-icon" style={{ backgroundColor: 'var(--status-scheduled-bg)', color: 'var(--status-scheduled)' }}>
                    <Calendar size={22} />
                  </div>
                  <div>
                    <div className="stat-value" style={{ color: 'var(--status-scheduled)', fontSize: '20px' }}>
                      {formatCurrency(totalSellerPrevista)}
                    </div>
                    <div className="stat-label">Comissões Previstas</div>
                  </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '5px solid var(--primary)' }}>
                  <div className="stat-icon" style={{ backgroundColor: '#dcfce7', color: 'var(--primary)' }}>
                    <Plus size={22} />
                  </div>
                  <div>
                    <div className="stat-value" style={{ color: 'var(--primary)', fontSize: '20px' }}>
                      {formatCurrency(totalSellerLiberada)}
                    </div>
                    <div className="stat-label">Comissões Liberadas</div>
                  </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '5px solid var(--status-won)' }}>
                  <div className="stat-icon" style={{ backgroundColor: 'var(--status-won-bg)', color: 'var(--status-won)' }}>
                    <Check size={22} />
                  </div>
                  <div>
                    <div className="stat-value" style={{ color: 'var(--status-won)', fontSize: '20px' }}>
                      {formatCurrency(totalSellerPaga)}
                    </div>
                    <div className="stat-label">Comissões Recebidas</div>
                  </div>
                </div>
              </div>

              {/* Commission Statement / History */}
              <div className="card">
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '17px' }}>Histórico de Extrato Comercial</h3>
                  <p style={{ color: 'var(--gray-500)', fontSize: '12px' }}>
                    Acompanhe o status de liberação dos seus pagamentos. Comissões saem de "Prevista" para "Liberada" assim que o financeiro confirma a baixa da parcela do boleto/Pix correspondente do cliente.
                  </p>
                </div>

                {sellerCommissions.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '24px', fontSize: '14px' }}>
                    Nenhuma comissão registrada em seu extrato comercial no momento.
                  </p>
                ) : (
                  <div className="mobile-card-list">
                    {sellerCommissions.map(c => (
                      <div key={c.id} className="mobile-card" style={{ borderLeft: `4px solid ${c.status === 'paid' ? 'var(--status-won)' : c.status === 'released' ? 'var(--primary)' : 'var(--status-scheduled)'}` }}>
                        <div className="flex justify-between align-center">
                          <div>
                            <span style={{ fontWeight: 700, fontSize: '14px', display: 'block' }}>
                              Comissão sobre Venda
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                              Faturamento base líquido: {formatCurrency(c.base_amount)}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--gray-800)' }}>
                              {formatCurrency(c.commission_amount)}
                            </span>
                            <span className={`status-badge status-${c.status}`} style={{ display: 'inline-block', marginTop: '4px', fontSize: '10px' }}>
                              {c.status === 'expected' ? 'Prevista' : c.status === 'released' ? 'Liberada' : 'Paga'}
                            </span>
                          </div>
                        </div>

                        {c.notes && (
                          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--gray-600)', fontStyle: 'italic' }}>
                            {c.notes}
                          </p>
                        )}

                        {c.status === 'paid' && c.paid_at && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--gray-400)', textAlign: 'right' }}>
                            ✓ Creditado pela empresa em {formatDate(c.paid_at)}
                          </div>
                        )}
                        {c.status === 'released' && c.released_at && (
                          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--primary)', fontWeight: 600, textAlign: 'right' }}>
                            ★ Pronto para resgatar/receber (Liberado em {formatDate(c.released_at)})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================== FORM MODAL: REGISTER/EDIT SALE ==================== */}
      {showSaleModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="modal-content card" style={{ width: '90%', maxWidth: '600px', padding: '24px', backgroundColor: '#fff', maxHeight: '95vh', overflowY: 'auto' }}>
            <div className="flex justify-between align-center" style={{ marginBottom: '20px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', margin: 0, color: editingSaleId ? '#1d4ed8' : 'var(--primary)', fontWeight: 700 }}>
                {editingSaleId ? <><Edit2 size={18} style={{ display: 'inline', marginRight: '6px' }} />Editar Venda Comercial</> : 'Lançar Venda Técnica Comercial'}
              </h2>
              <button className="tab-btn" onClick={() => { setShowSaleModal(false); setEditingSaleId(null); }} style={{ fontSize: '20px', padding: 0 }}>&times;</button>
            </div>

            {editingSaleId && (
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={14} />
                <span>Modo de Edição: As parcelas e comissões anteriores serão substituídas ao salvar.</span>
              </div>
            )}

            <form onSubmit={handleSaveSale}>
              {/* Cliente */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Cliente Comprador *</label>
                <select 
                  className="form-control"
                  required
                  value={newSale.customer_id}
                  onChange={(e) => setNewSale({ ...newSale, customer_id: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', backgroundColor: '#fff' }}
                >
                  <option value="">Selecione o Cliente</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Modo de Precificação *</label>
                <div className="flex gap-2" style={{ backgroundColor: 'var(--gray-100)', padding: '4px', borderRadius: 'var(--radius)' }}>
                  <button
                    type="button"
                    className="flex-1"
                    onClick={() => setNewSale(prev => ({ ...prev, pricing_mode: 'per_nozzle' }))}
                    style={{
                      padding: '6px',
                      borderRadius: 'calc(var(--radius) - 2px)',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: newSale.pricing_mode === 'per_nozzle' ? '#fff' : 'transparent',
                      color: newSale.pricing_mode === 'per_nozzle' ? 'var(--primary)' : 'var(--gray-600)'
                    }}
                  >
                    Por Bico Eletrostático
                  </button>
                  <button
                    type="button"
                    className="flex-1"
                    onClick={() => setNewSale(prev => ({ ...prev, pricing_mode: 'flat_rate' }))}
                    style={{
                      padding: '6px',
                      borderRadius: 'calc(var(--radius) - 2px)',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: newSale.pricing_mode === 'flat_rate' ? '#fff' : 'transparent',
                      color: newSale.pricing_mode === 'flat_rate' ? 'var(--primary)' : 'var(--gray-600)'
                    }}
                  >
                    Valor Geral Fechado
                  </button>
                </div>
              </div>

              {/* Technical Specifications */}
              <div style={{ backgroundColor: 'var(--gray-50)', padding: '12px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Especificações do Pulverizador
                </span>
                
                <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Barra (m)</label>
                    <input 
                      type="number"
                      className="form-control"
                      value={newSale.boom_width_m}
                      onChange={(e) => setNewSale({ ...newSale, boom_width_m: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Espaçamento</label>
                    <select 
                      className="form-control"
                      value={newSale.nozzle_spacing_cm}
                      onChange={(e) => setNewSale({ ...newSale, nozzle_spacing_cm: Number(e.target.value) })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', backgroundColor: '#fff' }}
                    >
                      <option value="50">50 cm</option>
                      <option value="35">35 cm</option>
                      <option value="45">45 cm</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Bicos Reais</label>
                    <input 
                      type="number"
                      className="form-control"
                      value={newSale.physical_nozzles_count}
                      onChange={(e) => setNewSale({ ...newSale, physical_nozzles_count: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Módulos Eletrostáticos</label>
                    <input 
                      type="number"
                      className="form-control"
                      value={newSale.nozzles_count}
                      onChange={(e) => setNewSale({ ...newSale, nozzles_count: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', fontWeight: 700 }}
                    />
                  </div>
                </div>

                {Number(newSale.nozzle_spacing_cm) === 35 && (
                  <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', fontSize: '10px', padding: '6px', borderRadius: 'var(--radius)', marginTop: '8px', lineHeight: 1.3 }}>
                    💡 <strong>Espaçamento 35cm:</strong> Sugerido 50% de bicos eletrostáticos (módulos isoladores compartilhados) para os bicos físicos reais.
                  </div>
                )}
              </div>

              {/* Price / Total amount inputs */}
              {newSale.pricing_mode === 'per_nozzle' ? (
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Preço por Bico Eletrostático (R$) *</label>
                  <input 
                    type="number"
                    className="form-control"
                    required
                    min="1"
                    value={newSale.price_per_nozzle}
                    onChange={(e) => setNewSale({ ...newSale, price_per_nozzle: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', borderColor: isBelowMinPrice ? '#ef4444' : 'var(--gray-200)' }}
                  />
                  <div className="flex justify-between align-center" style={{ marginTop: '4px', fontSize: '11px' }}>
                    <span style={{ color: 'var(--gray-400)' }}>Mínimo tabela: R$ {NOZZLE_BASE_PRICE}</span>
                    {isBelowMinPrice && <span style={{ color: '#ef4444', fontWeight: 600 }}>Abaixo do mínimo!</span>}
                  </div>
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Valor Geral Fechado (R$) *</label>
                  <input 
                    type="number"
                    className="form-control"
                    required
                    min="1"
                    value={newSale.flat_rate_amount}
                    onChange={(e) => setNewSale({ ...newSale, flat_rate_amount: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', borderColor: isBelowMinPrice ? '#ef4444' : 'var(--gray-200)' }}
                  />
                  <div className="flex justify-between align-center" style={{ marginTop: '4px', fontSize: '11px' }}>
                    <span style={{ color: 'var(--gray-400)' }}>Equivalente: {formatCurrency(simEquivalentPrice)} / módulo</span>
                    {isBelowMinPrice && <span style={{ color: '#ef4444', fontWeight: 600 }}>Abaixo do mínimo!</span>}
                  </div>
                </div>
              )}

              {/* Payment conditions & method */}
              <div className="grid gap-2" style={{ gridTemplateColumns: '1.2fr 1fr', marginBottom: '14px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Condição / Prazos</label>
                  <select
                    className="form-control"
                    value={newSale.payment_terms}
                    onChange={(e) => setNewSale({ ...newSale, payment_terms: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', backgroundColor: '#fff' }}
                  >
                    <option value="1x">À Vista (1x)</option>
                    <option value="30_60">30/60 Dias (2x)</option>
                    <option value="30_60_90">30/60/90 Dias (3x)</option>
                    <option value="entrada_safra_marco">Entrada + Safra (30/03)</option>
                    <option value="entrada_safra_abril">Entrada + Safra (30/04)</option>
                    <option value="entrada_safra_safrinha_marco_junho">Entrada + Safra (30/03) + Safrinha (30/06)</option>
                    <option value="entrada_safra_safrinha_abril_junho">Entrada + Safra (30/04) + Safrinha (30/06)</option>
                    <option value="entrada_safra_safrinha_abril_julho">Entrada + Safra (30/04) + Safrinha (30/07)</option>
                    <option value="customizado">Personalizado (Manual)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Forma Pagamento</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newSale.payment_method}
                    onChange={(e) => setNewSale({ ...newSale, payment_method: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}
                  />
                </div>
              </div>

              {/* Dynamic Crops schedule list */}
              <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '12px', backgroundColor: 'var(--gray-50)', marginBottom: '14px' }}>
                <div className="flex justify-between align-center" style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-600)' }}>Cronograma de Recebimento Agrícola</span>
                  <button
                    type="button"
                    onClick={addInstallment}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    + Parcela
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {installments.map((inst, index) => (
                    <div key={index} className="flex gap-2 align-center">
                      <input 
                        type="text" 
                        value={inst.label} 
                        onChange={(e) => handleInstallmentLabelChange(index, e.target.value)}
                        style={{ flex: 1, padding: '4px', fontSize: '11px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)' }} 
                      />
                      <input 
                        type="date" 
                        value={inst.due_date} 
                        onChange={(e) => handleInstallmentDateChange(index, e.target.value)}
                        style={{ width: '90px', padding: '4px', fontSize: '11px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)' }} 
                      />
                      <input 
                        type="number" 
                        step="0.01"
                        value={inst.percentage} 
                        onChange={(e) => handleInstallmentPercentChange(index, e.target.value)}
                        style={{ width: '50px', padding: '4px', fontSize: '11px', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)' }} 
                      />
                      <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>%</span>
                      <button 
                        type="button" 
                        disabled={installments.length <= 1}
                        onClick={() => removeInstallment(index)} 
                        style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between align-center" style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '6px', marginTop: '6px', fontSize: '11px' }}>
                  <span>Soma: <strong>{totalPercentSum.toFixed(2)}%</strong></span>
                  <button type="button" onClick={autoAdjustLastInstallment} style={{ border: 'none', background: 'none', color: 'var(--gray-500)', fontSize: '10px', textDecoration: 'underline', cursor: 'pointer' }}>
                    Reajustar Última
                  </button>
                </div>
              </div>

              {/* Financial metrics block */}
              <div style={{ backgroundColor: 'var(--gray-50)', padding: '12px', borderRadius: 'var(--radius)', marginBottom: '14px', fontSize: '12px' }}>
                <div className="flex justify-between" style={{ marginBottom: '3px' }}>
                  <span>Bruto:</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(simGrossTotal)}</span>
                </div>
                <div className="flex justify-between" style={{ color: '#ef4444', marginBottom: '3px' }}>
                  <span>Imposto (10%):</span>
                  <span>{formatCurrency(simTaxes)}</span>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--primary)', fontWeight: 750, borderTop: '1px solid var(--gray-200)', paddingTop: '4px' }}>
                  <span>Líquido:</span>
                  <span>{formatCurrency(simNetTotal)}</span>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--status-won)', fontWeight: 750 }}>
                  <span>Comissão (10%):</span>
                  <span>{formatCurrency(simCommission)}</span>
                </div>
              </div>

              {/* Sellers selector for Admin convenience */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Vendedor Responsável</label>
                <select
                  className="form-control"
                  value={sellers[0]?.id || ''}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', backgroundColor: 'var(--gray-50)' }}
                  disabled
                >
                  {sellers.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3" style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowSaleModal(false); setEditingSaleId(null); }}>Cancelar</button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={!isPercentValid}
                  style={{ backgroundColor: editingSaleId ? '#1d4ed8' : undefined }}
                >
                  {editingSaleId ? 'Salvar Alterações' : 'Gravar Venda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== FORM MODAL: REGISTER EXPENSE (ADMIN ONLY) ==================== */}
      {showExpenseModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="modal-content card" style={{ width: '90%', maxWidth: '450px', padding: '24px', backgroundColor: '#fff' }}>
            <div className="flex justify-between align-center" style={{ marginBottom: '20px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>Registrar Nova Despesa Operacional</h2>
              <button className="tab-btn" onClick={() => setShowExpenseModal(false)} style={{ fontSize: '20px', padding: 0 }}>&times;</button>
            </div>

            <form onSubmit={handleSaveExpense}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Fornecedor / Favorecido *</label>
                <input 
                  type="text"
                  className="form-control"
                  required
                  placeholder="Ex: Inox Brasil Ltda"
                  value={newExpense.supplier_name}
                  onChange={(e) => setNewExpense({ ...newExpense, supplier_name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}
                />
              </div>

              <div className="grid gap-2" style={{ gridTemplateColumns: '1.2fr 1fr', marginBottom: '14px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Categoria *</label>
                  <select 
                    className="form-control"
                    required
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}
                  >
                    <option value="Matéria-prima">Matéria-prima</option>
                    <option value="Comissão">Comissão de Equipe</option>
                    <option value="Frete">Logística & Frete</option>
                    <option value="Impostos">Impostos & Tributos</option>
                    <option value="Marketing">Marketing & Comercial</option>
                    <option value="Ferramentas">Ferramentas & TI</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Valor da Despesa (R$) *</label>
                  <input 
                    type="number"
                    className="form-control"
                    required
                    min="1"
                    placeholder="0.00"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Data de Vencimento *</label>
                <input 
                  type="date"
                  className="form-control"
                  required
                  value={newExpense.due_date}
                  onChange={(e) => setNewExpense({ ...newExpense, due_date: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Descrição / Descritivo rápido</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="Ex: Compra de 50 barras inox"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}
                />
              </div>

              <div className="flex justify-end gap-3" style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowExpenseModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#ef4444' }}>Registrar Saída</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
