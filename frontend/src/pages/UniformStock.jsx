import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const STORAGE_VERSION = 'uniform_stock_v4_nexo';

const sectorUniformRules = {
  Suporte: { shirtColor: 'Roxa', defaultUniformType: 'Polo' },
  Infraestrutura: { shirtColor: 'Azul', defaultUniformType: 'Polo' },
  RH: { shirtColor: 'Verde', defaultUniformType: 'Polo' },
  Administrativo: { shirtColor: 'Verde', defaultUniformType: 'Polo' },
  Comercial: { shirtColor: 'Verde', defaultUniformType: 'Polo' },
  Marketing: { shirtColor: 'Verde', defaultUniformType: 'Polo' },
};

const uniformTypeOptions = [
  'Polo',
  'Camisa social',
  'Camisa UV',
  'Vestido',
  'Calça de obra',
  'Calça padrão',
  'Boné',
  'Crachá',
  'Bota',
];

const clothingSizes = ['PP', 'P', 'M', 'G', 'GG', 'GGG'];
const shoeSizes = [
  '34',
  '35',
  '36',
  '37',
  '38',
  '39',
  '40',
  '41',
  '42',
  '43',
  '44',
];
const pantsSizes = ['36', '38', '40', '42', '44', '46', '48'];
const singleSizeOptions = ['Único'];

const getSizeOptionsByType = (type) => {
  const normalizedType = String(type || '')
    .toLowerCase()
    .trim();

  if (normalizedType === 'bota') return shoeSizes;

  if (
    normalizedType === 'polo' ||
    normalizedType === 'camisa social' ||
    normalizedType === 'camisa uv' ||
    normalizedType === 'vestido'
  ) {
    return clothingSizes;
  }

  if (
    normalizedType === 'calça de obra' ||
    normalizedType === 'calca de obra' ||
    normalizedType === 'calça padrão' ||
    normalizedType === 'calca padrão'
  ) {
    return pantsSizes;
  }

  if (
    normalizedType === 'crachá' ||
    normalizedType === 'cracha' ||
    normalizedType === 'boné' ||
    normalizedType === 'bone'
  ) {
    return singleSizeOptions;
  }

  return [];
};

const isPantsType = (type) => {
  const normalizedType = String(type || '')
    .toLowerCase()
    .trim();

  return (
    normalizedType === 'calça de obra' ||
    normalizedType === 'calca de obra' ||
    normalizedType === 'calça padrão' ||
    normalizedType === 'calca padrão'
  );
};

const isShirtType = (type) => {
  const normalizedType = String(type || '')
    .toLowerCase()
    .trim();

  return (
    normalizedType === 'polo' ||
    normalizedType === 'camisa social' ||
    normalizedType === 'camisa uv' ||
    normalizedType === 'vestido'
  );
};

const isBootType = (type) => {
  return (
    String(type || '')
      .toLowerCase()
      .trim() === 'bota'
  );
};

const isSingleSizeType = (type) => {
  const normalizedType = String(type || '')
    .toLowerCase()
    .trim();

  return (
    normalizedType === 'boné' ||
    normalizedType === 'bone' ||
    normalizedType === 'crachá' ||
    normalizedType === 'cracha'
  );
};

const getDisplayColor = (color, type) => {
  if (isPantsType(type)) return 'Padrão';
  return color || 'Padrão';
};

const buildItemLabel = (item) => {
  const parts = [item.type];

  if (!isPantsType(item.type) && item.color) {
    parts.push(item.color);
  }

  if (isPantsType(item.type)) {
    parts.push('Padrão');
  }

  parts.push(item.size);

  return parts.join(' ');
};

const getCompatibilityStatus = (itemType, itemSize, recommendedSize) => {
  if (!itemType) {
    return {
      label: 'Selecione um item',
      className: 'border border-slate-200 bg-slate-100 text-slate-700',
      description: 'Escolha um item para validar a compatibilidade.',
    };
  }

  if (isSingleSizeType(itemType)) {
    return {
      label: 'Compatível',
      className: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
      description: 'Este item utiliza tamanho único.',
    };
  }

  if (!recommendedSize) {
    return {
      label: 'Sem tamanho cadastrado',
      className: 'border border-amber-200 bg-amber-50 text-amber-700',
      description:
        'O colaborador ainda não possui esse tamanho definido no cadastro.',
    };
  }

  if (itemSize === recommendedSize) {
    return {
      label: 'Compatível',
      className: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
      description:
        'O item selecionado bate com o tamanho cadastrado do colaborador.',
    };
  }

  return {
    label: 'Tamanho divergente',
    className: 'border border-red-200 bg-red-50 text-red-700',
    description:
      'O item selecionado é diferente do tamanho cadastrado do colaborador.',
  };
};

const initialStock = [
  {
    id: 1,
    sector: 'Suporte',
    type: 'Polo',
    color: 'Roxa',
    size: 'M',
    quantity: 10,
  },
  {
    id: 2,
    sector: 'Suporte',
    type: 'Polo',
    color: 'Roxa',
    size: 'G',
    quantity: 10,
  },
  {
    id: 3,
    sector: 'Suporte',
    type: 'Polo',
    color: 'Roxa',
    size: 'GG',
    quantity: 10,
  },
  {
    id: 4,
    sector: 'Suporte',
    type: 'Crachá',
    color: 'Roxa',
    size: 'Único',
    quantity: 10,
  },

  {
    id: 5,
    sector: 'Infraestrutura',
    type: 'Polo',
    color: 'Azul',
    size: 'M',
    quantity: 10,
  },
  {
    id: 6,
    sector: 'Infraestrutura',
    type: 'Polo',
    color: 'Azul',
    size: 'G',
    quantity: 10,
  },
  {
    id: 7,
    sector: 'Infraestrutura',
    type: 'Polo',
    color: 'Azul',
    size: 'GG',
    quantity: 10,
  },
  {
    id: 8,
    sector: 'Infraestrutura',
    type: 'Crachá',
    color: 'Azul',
    size: 'Único',
    quantity: 10,
  },

  {
    id: 9,
    sector: 'RH',
    type: 'Polo',
    color: 'Verde',
    size: 'M',
    quantity: 10,
  },
  {
    id: 10,
    sector: 'RH',
    type: 'Polo',
    color: 'Verde',
    size: 'G',
    quantity: 10,
  },
  {
    id: 11,
    sector: 'RH',
    type: 'Polo',
    color: 'Verde',
    size: 'GG',
    quantity: 10,
  },
  {
    id: 12,
    sector: 'RH',
    type: 'Crachá',
    color: 'Verde',
    size: 'Único',
    quantity: 10,
  },

  {
    id: 13,
    sector: 'Administrativo',
    type: 'Polo',
    color: 'Verde',
    size: 'M',
    quantity: 8,
  },
  {
    id: 14,
    sector: 'Administrativo',
    type: 'Polo',
    color: 'Verde',
    size: 'G',
    quantity: 8,
  },
  {
    id: 15,
    sector: 'Administrativo',
    type: 'Crachá',
    color: 'Verde',
    size: 'Único',
    quantity: 8,
  },

  {
    id: 16,
    sector: 'Comercial',
    type: 'Polo',
    color: 'Verde',
    size: 'M',
    quantity: 8,
  },
  {
    id: 17,
    sector: 'Comercial',
    type: 'Polo',
    color: 'Verde',
    size: 'G',
    quantity: 8,
  },
  {
    id: 18,
    sector: 'Comercial',
    type: 'Crachá',
    color: 'Verde',
    size: 'Único',
    quantity: 8,
  },

  {
    id: 19,
    sector: 'Marketing',
    type: 'Polo',
    color: 'Verde',
    size: 'M',
    quantity: 8,
  },
  {
    id: 20,
    sector: 'Marketing',
    type: 'Polo',
    color: 'Verde',
    size: 'G',
    quantity: 8,
  },
  {
    id: 21,
    sector: 'Marketing',
    type: 'Crachá',
    color: 'Verde',
    size: 'Único',
    quantity: 8,
  },

  {
    id: 22,
    sector: 'Geral',
    type: 'Calça de obra',
    color: '',
    size: '40',
    quantity: 8,
  },
  {
    id: 23,
    sector: 'Geral',
    type: 'Calça de obra',
    color: '',
    size: '42',
    quantity: 8,
  },
  {
    id: 24,
    sector: 'Geral',
    type: 'Calça padrão',
    color: '',
    size: '38',
    quantity: 8,
  },
  {
    id: 25,
    sector: 'Geral',
    type: 'Calça padrão',
    color: '',
    size: '40',
    quantity: 8,
  },
  {
    id: 26,
    sector: 'Geral',
    type: 'Boné',
    color: 'Preto',
    size: 'Único',
    quantity: 15,
  },
  {
    id: 27,
    sector: 'Geral',
    type: 'Vestido',
    color: 'Verde',
    size: 'M',
    quantity: 5,
  },
  {
    id: 28,
    sector: 'Geral',
    type: 'Camisa UV',
    color: 'Azul',
    size: 'G',
    quantity: 8,
  },
  {
    id: 29,
    sector: 'Gestão',
    type: 'Camisa social',
    color: 'Branca',
    size: 'M',
    quantity: 6,
  },
  {
    id: 30,
    sector: 'Gestão',
    type: 'Camisa social',
    color: 'Branca',
    size: 'G',
    quantity: 6,
  },
  {
    id: 31,
    sector: 'Geral',
    type: 'Bota',
    color: 'Preta',
    size: '40',
    quantity: 6,
  },
  {
    id: 32,
    sector: 'Geral',
    type: 'Bota',
    color: 'Preta',
    size: '42',
    quantity: 6,
  },
];

const initialDeliveries = [
  {
    id: 1,
    employeeId: 1,
    employeeName: 'Gabriel Trisi',
    sector: 'Suporte',
    itemLabel: 'Polo Roxa M',
    itemType: 'Polo',
    itemColor: 'Roxa',
    itemSize: 'M',
    quantity: 1,
    date: '2026-04-07',
    notes: 'Entrega inicial',
    type: 'uniform_delivery',
  },
];

const initialItemForm = {
  sector: '',
  type: '',
  color: '',
  size: '',
  quantity: '',
};

const initialDeliveryForm = {
  employeeId: '',
  employeeName: '',
  sector: '',
  quantity: 1,
  notes: '',
  recommendedSize: '',
  selectedEmployeeData: null,
};

const UniformStock = () => {
  const [activeTab, setActiveTab] = useState('stock');
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const token = localStorage.getItem('token');

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const [stock, setStock] = useState(() => {
    const currentVersion = localStorage.getItem('uniformStockVersion');

    if (currentVersion !== STORAGE_VERSION) {
      localStorage.setItem('uniformStockVersion', STORAGE_VERSION);
      localStorage.setItem('uniformStock', JSON.stringify(initialStock));
      return initialStock;
    }

    const savedStock = localStorage.getItem('uniformStock');
    return savedStock ? JSON.parse(savedStock) : initialStock;
  });

  const [deliveries, setDeliveries] = useState(() => {
    const currentVersion = localStorage.getItem('uniformStockVersion');

    if (currentVersion !== STORAGE_VERSION) {
      localStorage.setItem(
        'uniformDeliveries',
        JSON.stringify(initialDeliveries)
      );
      return initialDeliveries;
    }

    const savedDeliveries = localStorage.getItem('uniformDeliveries');
    return savedDeliveries ? JSON.parse(savedDeliveries) : initialDeliveries;
  });

  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('Todos');
  const [deliverySearch, setDeliverySearch] = useState('');
  const [deliverySectorFilter, setDeliverySectorFilter] = useState('Todos');

  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isDeliveryDrawerOpen, setIsDeliveryDrawerOpen] = useState(false);

  const [itemForm, setItemForm] = useState(initialItemForm);
  const [deliveryForm, setDeliveryForm] = useState(initialDeliveryForm);

  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    localStorage.setItem('uniformStock', JSON.stringify(stock));
  }, [stock]);

  useEffect(() => {
    localStorage.setItem('uniformDeliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setEmployeesLoading(true);

      const response = await axios.get(`${API_URL}/employees`, {
        headers: authHeaders,
      });

      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error('Erro ao buscar colaboradores:', error);
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const getEmployeeName = (employee) =>
    employee?.fullName || employee?.name || '-';

  const getEmployeeSector = (employee) =>
    employee?.sector || employee?.department || '-';

  const getEmployeeRole = (employee) =>
    employee?.position || employee?.role || '-';

  const getEmployeeShirtSize = (employee) =>
    employee?.shirtSize || employee?.uniformSize || '';

  const getEmployeePantsSize = (employee) => employee?.pantsSize || '';

  const getEmployeeBootSize = (employee) => employee?.bootSize || '';

  const getSuggestedColor = (sector, type) => {
    const normalizedType = (type || '').toLowerCase().trim();
    const sectorRule = sectorUniformRules[sector];

    if (!sectorRule) return '';

    if (normalizedType === 'polo') {
      return sectorRule.shirtColor;
    }

    if (normalizedType === 'crachá' || normalizedType === 'cracha') {
      return sectorRule.shirtColor;
    }

    return '';
  };

  const isAutoColorType = (sector, type) => {
    const normalizedType = String(type || '')
      .toLowerCase()
      .trim();
    const sectorRule = sectorUniformRules[sector];

    if (!sectorRule) return false;

    return (
      normalizedType === 'polo' ||
      normalizedType === 'crachá' ||
      normalizedType === 'cracha'
    );
  };

  const getRecommendedSizeByEmployee = (employee, itemType) => {
    if (!employee || !itemType) return '';

    if (isShirtType(itemType)) return getEmployeeShirtSize(employee);
    if (isPantsType(itemType)) return getEmployeePantsSize(employee);
    if (isBootType(itemType)) return getEmployeeBootSize(employee);
    if (isSingleSizeType(itemType)) return 'Único';

    return '';
  };

  const sectors = ['Todos', ...new Set(stock.map((item) => item.sector))];
  const deliverySectors = [
    'Todos',
    ...new Set(deliveries.map((item) => item.sector).filter(Boolean)),
  ];

  const filteredStock = useMemo(() => {
    return stock.filter((item) => {
      const matchesSearch = `
        ${item.sector}
        ${item.type}
        ${item.color}
        ${item.size}
      `
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesSector =
        sectorFilter === 'Todos' || item.sector === sectorFilter;

      return matchesSearch && matchesSector;
    });
  }, [stock, search, sectorFilter]);

  const sectorGroups = useMemo(() => {
    const grouped = {};

    filteredStock.forEach((item) => {
      if (!grouped[item.sector]) {
        grouped[item.sector] = {};
      }

      const itemKey = `${item.type}__${item.color || 'sem-cor'}`;

      if (!grouped[item.sector][itemKey]) {
        grouped[item.sector][itemKey] = {
          sector: item.sector,
          type: item.type,
          color: item.color,
          totalQuantity: 0,
          sizes: [],
        };
      }

      grouped[item.sector][itemKey].sizes.push(item);
      grouped[item.sector][itemKey].totalQuantity += Number(item.quantity || 0);
    });

    return Object.entries(grouped)
      .map(([sector, itemsMap]) => ({
        sector,
        items: Object.values(itemsMap).sort((a, b) => {
          if (a.type !== b.type) return a.type.localeCompare(b.type);
          return String(a.color || '').localeCompare(String(b.color || ''));
        }),
      }))
      .sort((a, b) => a.sector.localeCompare(b.sector));
  }, [filteredStock]);

  const totalItems = stock.reduce(
    (acc, item) => acc + Number(item.quantity || 0),
    0
  );

  const lowStockItems = stock.filter(
    (item) => item.quantity > 0 && item.quantity <= 3
  ).length;

  const outOfStockItems = stock.filter((item) => item.quantity === 0).length;

  const recentDeliveries = [...deliveries]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  const deliveriesByEmployee = useMemo(() => {
    const filtered = deliveries.filter((delivery) => {
      const matchesName = `
        ${delivery.employeeName || ''}
        ${delivery.itemLabel || ''}
      `
        .toLowerCase()
        .includes(deliverySearch.toLowerCase());

      const matchesSector =
        deliverySectorFilter === 'Todos' ||
        delivery.sector === deliverySectorFilter;

      return matchesName && matchesSector;
    });

    const grouped = {};

    filtered.forEach((delivery) => {
      const employeeKey =
        delivery.employeeId ||
        delivery.employeeName ||
        `employee-${delivery.id}`;

      if (!grouped[employeeKey]) {
        grouped[employeeKey] = {
          employeeId: delivery.employeeId,
          employeeName: delivery.employeeName,
          sector: delivery.sector,
          deliveries: [],
          totalItems: 0,
        };
      }

      grouped[employeeKey].deliveries.push(delivery);
      grouped[employeeKey].totalItems += Number(delivery.quantity || 0);
    });

    return Object.values(grouped)
      .map((group) => ({
        ...group,
        deliveries: group.deliveries.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        ),
      }))
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [deliveries, deliverySearch, deliverySectorFilter]);

  const reports = useMemo(() => {
    const totalBySector = stock.reduce((acc, item) => {
      acc[item.sector] = (acc[item.sector] || 0) + Number(item.quantity || 0);
      return acc;
    }, {});

    const totalDeliveredBySector = deliveries.reduce((acc, item) => {
      acc[item.sector] = (acc[item.sector] || 0) + Number(item.quantity || 0);
      return acc;
    }, {});

    const totalDeliveredByEmployee = deliveries.reduce((acc, item) => {
      const key = item.employeeName || 'Sem nome';
      acc[key] = (acc[key] || 0) + Number(item.quantity || 0);
      return acc;
    }, {});

    return {
      totalBySector: Object.entries(totalBySector).sort((a, b) =>
        a[0].localeCompare(b[0])
      ),
      totalDeliveredBySector: Object.entries(totalDeliveredBySector).sort(
        (a, b) => a[0].localeCompare(b[0])
      ),
      totalDeliveredByEmployee: Object.entries(totalDeliveredByEmployee)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    };
  }, [stock, deliveries]);

  const getStockStatus = (quantity) => {
    if (quantity === 0) {
      return {
        label: 'Sem estoque',
        className: 'border border-red-200 bg-red-50 text-red-700',
      };
    }

    if (quantity <= 3) {
      return {
        label: 'Estoque baixo',
        className: 'border border-amber-200 bg-amber-50 text-amber-700',
      };
    }

    return {
      label: 'Disponível',
      className: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  };

  const formatDate = (date) => {
    if (!date) return '-';

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return date;

    return parsedDate.toLocaleDateString('pt-BR');
  };

  const openCreateDrawer = () => {
    setItemForm(initialItemForm);
    setIsCreateDrawerOpen(true);
  };

  const closeCreateDrawer = () => {
    setItemForm(initialItemForm);
    setIsCreateDrawerOpen(false);
  };

  const openDeliveryDrawer = (item) => {
    setSelectedItem(item);
    setDeliveryForm({
      employeeId: '',
      employeeName: '',
      sector: item.sector || '',
      quantity: 1,
      notes: '',
      recommendedSize: '',
      selectedEmployeeData: null,
    });
    setIsDeliveryDrawerOpen(true);
  };

  const closeDeliveryDrawer = () => {
    setSelectedItem(null);
    setDeliveryForm(initialDeliveryForm);
    setIsDeliveryDrawerOpen(false);
  };

  const handleItemFormChange = (e) => {
    const { name, value } = e.target;

    setItemForm((prev) => {
      const updatedForm = {
        ...prev,
        [name]: value,
      };

      if (name === 'sector' || name === 'type') {
        const nextSector = name === 'sector' ? value : updatedForm.sector;
        const nextType = name === 'type' ? value : updatedForm.type;

        const suggestedColor = getSuggestedColor(nextSector, nextType);

        if (suggestedColor) {
          updatedForm.color = suggestedColor;
        } else if (isPantsType(nextType)) {
          updatedForm.color = '';
        } else if (name === 'type') {
          updatedForm.color = '';
        }
      }

      if (name === 'type') {
        const allowedSizes = getSizeOptionsByType(value);

        if (allowedSizes.length === 1) {
          updatedForm.size = allowedSizes[0];
        } else {
          updatedForm.size = '';
        }
      }

      return updatedForm;
    });
  };

  const handleDeliveryFormChange = (e) => {
    const { name, value } = e.target;

    if (name === 'employeeId') {
      const selectedEmployee = employees.find(
        (employee) => String(employee.id) === String(value)
      );

      const recommendedSize = getRecommendedSizeByEmployee(
        selectedEmployee,
        selectedItem?.type
      );

      setDeliveryForm((prev) => ({
        ...prev,
        employeeId: value,
        employeeName: selectedEmployee ? getEmployeeName(selectedEmployee) : '',
        sector: selectedEmployee
          ? getEmployeeSector(selectedEmployee)
          : prev.sector,
        recommendedSize,
        selectedEmployeeData: selectedEmployee || null,
      }));
      return;
    }

    setDeliveryForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateItem = (e) => {
    e.preventDefault();

    if (
      !itemForm.sector ||
      !itemForm.type ||
      !itemForm.size ||
      !itemForm.quantity ||
      (!isAutoColorType(itemForm.sector, itemForm.type) &&
        !isPantsType(itemForm.type) &&
        !itemForm.color)
    ) {
      alert('Preencha todos os campos do novo item.');
      return;
    }

    const existingIndex = stock.findIndex(
      (item) =>
        item.sector.toLowerCase() === itemForm.sector.toLowerCase() &&
        item.type.toLowerCase() === itemForm.type.toLowerCase() &&
        String(item.color || '').toLowerCase() ===
          String(itemForm.color || '').toLowerCase() &&
        item.size.toLowerCase() === itemForm.size.toLowerCase()
    );

    if (existingIndex >= 0) {
      const updatedStock = [...stock];
      updatedStock[existingIndex] = {
        ...updatedStock[existingIndex],
        quantity:
          Number(updatedStock[existingIndex].quantity) +
          Number(itemForm.quantity),
      };
      setStock(updatedStock);
    } else {
      const newItem = {
        id: Date.now(),
        sector: itemForm.sector,
        type: itemForm.type,
        color: itemForm.color,
        size: itemForm.size,
        quantity: Number(itemForm.quantity),
      };

      setStock((prev) => [newItem, ...prev]);
    }

    closeCreateDrawer();
  };

  const handleDeliverUniform = (e) => {
    e.preventDefault();

    if (!selectedItem) return;

    if (!deliveryForm.employeeId || !deliveryForm.quantity) {
      alert('Selecione o colaborador e informe a quantidade.');
      return;
    }

    const quantityToDeliver = Number(deliveryForm.quantity);

    if (quantityToDeliver <= 0) {
      alert('A quantidade deve ser maior que zero.');
      return;
    }

    if (quantityToDeliver > selectedItem.quantity) {
      alert('Quantidade maior que o estoque disponível.');
      return;
    }

    if (
      deliveryForm.recommendedSize &&
      selectedItem.size !== deliveryForm.recommendedSize &&
      !isSingleSizeType(selectedItem.type)
    ) {
      const confirmMismatch = window.confirm(
        `O tamanho do item (${selectedItem.size}) é diferente do cadastro do colaborador (${deliveryForm.recommendedSize}). Deseja continuar mesmo assim?`
      );

      if (!confirmMismatch) {
        return;
      }
    }

    setStock((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id
          ? { ...item, quantity: item.quantity - quantityToDeliver }
          : item
      )
    );

    const newDelivery = {
      id: Date.now(),
      employeeId: Number(deliveryForm.employeeId),
      employeeName: deliveryForm.employeeName,
      sector: deliveryForm.sector,
      itemLabel: buildItemLabel(selectedItem),
      itemType: selectedItem.type,
      itemColor: selectedItem.color,
      itemSize: selectedItem.size,
      quantity: quantityToDeliver,
      date: new Date().toISOString().split('T')[0],
      notes: deliveryForm.notes,
      type: 'uniform_delivery',
    };

    setDeliveries((prev) => [newDelivery, ...prev]);
    closeDeliveryDrawer();
    setActiveTab('deliveries');
  };

  const renderStockTab = () => {
    if (sectorGroups.length === 0) {
      return (
        <div className='rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm'>
          Nenhum item de fardamento encontrado.
        </div>
      );
    }

    return (
      <div className='space-y-6'>
        {sectorGroups.map((sectorGroup) => (
          <section
            key={sectorGroup.sector}
            className='rounded-2xl border border-slate-200 bg-white shadow-sm'
          >
            <div className='border-b border-slate-200 px-6 py-5'>
              <div className='flex items-center justify-between gap-4'>
                <div>
                  <h3 className='text-xl font-semibold text-slate-800'>
                    {sectorGroup.sector}
                  </h3>
                  <p className='mt-1 text-sm text-slate-500'>
                    Itens disponíveis neste setor.
                  </p>
                </div>

                <span className='inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'>
                  {sectorGroup.items.length} grupo(s)
                </span>
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 p-6 xl:grid-cols-2'>
              {sectorGroup.items.map((group) => {
                const groupStatus = getStockStatus(group.totalQuantity);

                return (
                  <div
                    key={`${group.sector}-${group.type}-${group.color || 'sem-cor'}`}
                    className='rounded-2xl border border-slate-200 bg-slate-50 p-5'
                  >
                    <div className='flex flex-col gap-4'>
                      <div className='flex items-start justify-between gap-4'>
                        <div className='flex items-center gap-3'>
                          <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-bold text-slate-700 shadow-sm'>
                            {group.type.charAt(0)}
                          </div>

                          <div>
                            <h4 className='text-lg font-bold text-slate-800'>
                              {group.type}
                            </h4>
                            <p className='text-sm text-slate-500'>
                              Cor: {getDisplayColor(group.color, group.type)}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${groupStatus.className}`}
                        >
                          {groupStatus.label}
                        </span>
                      </div>

                      <div className='rounded-xl border border-slate-200 bg-white p-4'>
                        <div className='mb-3 flex items-center justify-between'>
                          <p className='text-sm font-semibold text-slate-700'>
                            Tamanhos disponíveis
                          </p>
                          <p className='text-sm text-slate-500'>
                            Total:{' '}
                            <span className='font-bold text-slate-800'>
                              {group.totalQuantity}
                            </span>
                          </p>
                        </div>

                        <div className='flex flex-wrap gap-2'>
                          {group.sizes
                            .sort((a, b) => a.size.localeCompare(b.size))
                            .map((item) => (
                              <button
                                key={item.id}
                                type='button'
                                onClick={() => openDeliveryDrawer(item)}
                                className='rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                              >
                                {item.size} • {item.quantity}
                              </button>
                            ))}
                        </div>
                      </div>

                      <div className='flex flex-wrap gap-2'>
                        {group.sizes
                          .sort((a, b) => a.size.localeCompare(b.size))
                          .slice(0, 3)
                          .map((item) => (
                            <button
                              key={item.id}
                              onClick={() => openDeliveryDrawer(item)}
                              className='rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700'
                            >
                              Entregar {item.size}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  };

  const renderDeliveriesTab = () => {
    return (
      <div className='space-y-6'>
        <section className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 px-6 py-5'>
            <h3 className='text-xl font-semibold text-slate-800'>
              Entregas por colaborador
            </h3>
            <p className='mt-1 text-sm text-slate-500'>
              Visual gerencial agrupando tudo o que cada colaborador já recebeu.
            </p>
          </div>

          <div className='border-b border-slate-200 px-6 py-5'>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
              <div className='lg:col-span-2'>
                <label className='mb-2 block text-sm font-semibold text-slate-700'>
                  Buscar colaborador
                </label>
                <input
                  type='text'
                  placeholder='Buscar por nome ou item entregue'
                  value={deliverySearch}
                  onChange={(e) => setDeliverySearch(e.target.value)}
                  className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                />
              </div>

              <div>
                <label className='mb-2 block text-sm font-semibold text-slate-700'>
                  Filtrar setor
                </label>
                <select
                  value={deliverySectorFilter}
                  onChange={(e) => setDeliverySectorFilter(e.target.value)}
                  className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                >
                  {deliverySectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {deliveriesByEmployee.length === 0 ? (
            <div className='px-6 py-10 text-slate-500'>
              Nenhuma entrega encontrada para os filtros informados.
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-4 p-6 xl:grid-cols-2'>
              {deliveriesByEmployee.map((employeeGroup) => (
                <div
                  key={employeeGroup.employeeId || employeeGroup.employeeName}
                  className='rounded-2xl border border-slate-200 bg-slate-50 p-5'
                >
                  <div className='mb-4 flex items-start justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      <div className='flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-700 shadow-sm'>
                        {employeeGroup.employeeName.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <h4 className='text-lg font-bold text-slate-800'>
                          {employeeGroup.employeeName}
                        </h4>
                        <p className='text-sm text-slate-500'>
                          Setor: {employeeGroup.sector}
                        </p>
                      </div>
                    </div>

                    <span className='inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700'>
                      {employeeGroup.totalItems} item(ns)
                    </span>
                  </div>

                  <div className='space-y-3'>
                    {employeeGroup.deliveries.map((delivery) => (
                      <div
                        key={delivery.id}
                        className='rounded-xl border border-slate-200 bg-white p-4'
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div>
                            <p className='font-semibold text-slate-800'>
                              {delivery.itemLabel}
                            </p>
                            <p className='mt-1 text-sm text-slate-500'>
                              Quantidade: {delivery.quantity}
                            </p>
                            {delivery.notes ? (
                              <p className='mt-2 text-sm text-slate-600'>
                                Obs: {delivery.notes}
                              </p>
                            ) : null}
                          </div>

                          <span className='inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'>
                            {formatDate(delivery.date)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 px-6 py-5'>
            <h3 className='text-xl font-semibold text-slate-800'>
              Entregas recentes
            </h3>
            <p className='mt-1 text-sm text-slate-500'>
              Histórico das últimas movimentações de fardamento.
            </p>
          </div>

          {recentDeliveries.length === 0 ? (
            <div className='px-6 py-10 text-slate-500'>
              Nenhuma entrega registrada ainda.
            </div>
          ) : (
            <div className='divide-y divide-slate-100'>
              {recentDeliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className='flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between'
                >
                  <div>
                    <p className='font-semibold text-slate-800'>
                      {delivery.employeeName}
                    </p>
                    <p className='text-sm text-slate-500'>
                      {delivery.itemLabel} • Quantidade: {delivery.quantity}
                    </p>
                    <p className='text-sm text-slate-500'>
                      Setor: {delivery.sector}
                    </p>
                    {delivery.notes ? (
                      <p className='mt-1 text-sm text-slate-600'>
                        Obs: {delivery.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className='md:text-right'>
                    <span className='inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700'>
                      {formatDate(delivery.date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderReportsTab = () => {
    return (
      <div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
        <section className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 px-6 py-5'>
            <h3 className='text-lg font-semibold text-slate-800'>
              Estoque por setor
            </h3>
          </div>

          <div className='divide-y divide-slate-100'>
            {reports.totalBySector.map(([sector, total]) => (
              <div
                key={sector}
                className='flex items-center justify-between px-6 py-4'
              >
                <span className='font-medium text-slate-700'>{sector}</span>
                <span className='rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800'>
                  {total}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 px-6 py-5'>
            <h3 className='text-lg font-semibold text-slate-800'>
              Entregas por setor
            </h3>
          </div>

          <div className='divide-y divide-slate-100'>
            {reports.totalDeliveredBySector.length === 0 ? (
              <div className='px-6 py-8 text-slate-500'>
                Nenhuma entrega registrada.
              </div>
            ) : (
              reports.totalDeliveredBySector.map(([sector, total]) => (
                <div
                  key={sector}
                  className='flex items-center justify-between px-6 py-4'
                >
                  <span className='font-medium text-slate-700'>{sector}</span>
                  <span className='rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700'>
                    {total}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className='rounded-2xl border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 px-6 py-5'>
            <h3 className='text-lg font-semibold text-slate-800'>
              Top colaboradores
            </h3>
          </div>

          <div className='divide-y divide-slate-100'>
            {reports.totalDeliveredByEmployee.length === 0 ? (
              <div className='px-6 py-8 text-slate-500'>
                Nenhuma entrega registrada.
              </div>
            ) : (
              reports.totalDeliveredByEmployee.map(([employeeName, total]) => (
                <div
                  key={employeeName}
                  className='flex items-center justify-between px-6 py-4'
                >
                  <span className='font-medium text-slate-700'>
                    {employeeName}
                  </span>
                  <span className='rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700'>
                    {total}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    );
  };

  const compatibilityStatus = getCompatibilityStatus(
    selectedItem?.type,
    selectedItem?.size,
    deliveryForm.recommendedSize
  );

  return (
    <>
      <div className='space-y-6'>
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div>
            <p className='text-sm font-medium uppercase tracking-wide text-slate-500'>
              ELO
            </p>
            <h1 className='text-3xl font-bold text-slate-800'>Fardamento</h1>
            <p className='mt-1 text-slate-500'>
              Controle de uniformes por setor, tamanho, cor e histórico de
              entregas.
            </p>
          </div>

          <button
            onClick={openCreateDrawer}
            className='rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800'
          >
            + Novo item
          </button>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Total em estoque</p>
            <h2 className='mt-2 text-3xl font-bold text-slate-800'>
              {totalItems}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Estoque baixo</p>
            <h2 className='mt-2 text-3xl font-bold text-amber-600'>
              {lowStockItems}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Sem estoque</p>
            <h2 className='mt-2 text-3xl font-bold text-red-600'>
              {outOfStockItems}
            </h2>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <p className='text-sm text-slate-500'>Entregas registradas</p>
            <h2 className='mt-2 text-3xl font-bold text-blue-600'>
              {deliveries.length}
            </h2>
          </div>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={() => setActiveTab('stock')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'stock'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Estoque
            </button>

            <button
              type='button'
              onClick={() => setActiveTab('deliveries')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'deliveries'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Entregas
            </button>

            <button
              type='button'
              onClick={() => setActiveTab('reports')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === 'reports'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Relatórios
            </button>
          </div>
        </div>

        {activeTab === 'stock' && (
          <>
            <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
              <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
                <div className='lg:col-span-2'>
                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                    Busca rápida
                  </label>
                  <input
                    type='text'
                    placeholder='Buscar por setor, tipo, cor ou tamanho'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                  />
                </div>

                <div>
                  <label className='mb-2 block text-sm font-semibold text-slate-700'>
                    Filtrar por setor
                  </label>
                  <select
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                    className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500'
                  >
                    {sectors.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {renderStockTab()}
          </>
        )}

        {activeTab === 'deliveries' && renderDeliveriesTab()}
        {activeTab === 'reports' && renderReportsTab()}
      </div>

      {isCreateDrawerOpen && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={closeCreateDrawer}
          />

          <div className='relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3'>
                  <button
                    type='button'
                    onClick={closeCreateDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    ← Voltar
                  </button>

                  <div>
                    <div className='mb-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600'>
                      Novo item
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      Cadastrar fardamento
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      Adicione ou reforce o estoque de um item.
                    </p>
                  </div>
                </div>

                <button
                  type='button'
                  onClick={closeCreateDrawer}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  ✕
                </button>
              </div>
            </div>

            <form
              onSubmit={handleCreateItem}
              className='flex min-h-0 flex-1 flex-col'
            >
              <div className='flex-1 overflow-y-auto px-6 py-6'>
                <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                  <div className='grid grid-cols-1 gap-5'>
                    <div>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Setor
                      </label>
                      <select
                        name='sector'
                        value={itemForm.sector}
                        onChange={handleItemFormChange}
                        className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500'
                      >
                        <option value=''>Selecione o setor</option>
                        {Object.keys(sectorUniformRules).map((sector) => (
                          <option key={sector} value={sector}>
                            {sector}
                          </option>
                        ))}
                        <option value='Geral'>Geral</option>
                        <option value='Gestão'>Gestão</option>
                      </select>
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Tipo
                      </label>
                      <select
                        name='type'
                        value={itemForm.type}
                        onChange={handleItemFormChange}
                        className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500'
                      >
                        <option value=''>Selecione o tipo</option>
                        {uniformTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Cor
                      </label>
                      <input
                        type='text'
                        name='color'
                        value={itemForm.color}
                        onChange={handleItemFormChange}
                        placeholder={
                          isAutoColorType(itemForm.sector, itemForm.type)
                            ? 'Cor definida automaticamente pelo setor'
                            : isPantsType(itemForm.type)
                              ? 'Calça não utiliza cor'
                              : 'Digite a cor'
                        }
                        disabled={
                          isAutoColorType(itemForm.sector, itemForm.type) ||
                          isPantsType(itemForm.type)
                        }
                        className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100'
                      />
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Tamanho
                      </label>
                      <select
                        name='size'
                        value={itemForm.size}
                        onChange={handleItemFormChange}
                        disabled={!itemForm.type}
                        className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100'
                      >
                        <option value=''>
                          {itemForm.type
                            ? 'Selecione o tamanho'
                            : 'Escolha primeiro o tipo'}
                        </option>

                        {getSizeOptionsByType(itemForm.type).map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className='mb-2 block text-sm font-semibold text-slate-700'>
                        Quantidade
                      </label>
                      <input
                        type='number'
                        name='quantity'
                        value={itemForm.quantity}
                        onChange={handleItemFormChange}
                        placeholder='Digite a quantidade'
                        className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500'
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className='border-t border-slate-200 bg-white px-6 py-4'>
                <div className='flex items-center justify-end gap-3'>
                  <button
                    type='button'
                    onClick={closeCreateDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    Cancelar
                  </button>

                  <button
                    type='submit'
                    className='rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800'
                  >
                    Salvar item
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeliveryDrawerOpen && selectedItem && (
        <div className='fixed inset-0 z-50 flex justify-end'>
          <div
            className='absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]'
            onClick={closeDeliveryDrawer}
          />

          <div className='relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl'>
            <div className='border-b border-slate-200 bg-white px-6 py-5'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3'>
                  <button
                    type='button'
                    onClick={closeDeliveryDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    ← Voltar
                  </button>

                  <div>
                    <div className='mb-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700'>
                      Entrega de uniforme
                    </div>
                    <h2 className='text-2xl font-bold text-slate-800'>
                      {selectedItem.sector} • {selectedItem.type}
                    </h2>
                    <p className='mt-1 text-sm text-slate-500'>
                      {getDisplayColor(selectedItem.color, selectedItem.type)} •{' '}
                      Tamanho {selectedItem.size} • Estoque atual:{' '}
                      {selectedItem.quantity}
                    </p>
                  </div>
                </div>

                <button
                  type='button'
                  onClick={closeDeliveryDrawer}
                  className='rounded-xl px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'
                >
                  ✕
                </button>
              </div>
            </div>

            <form
              onSubmit={handleDeliverUniform}
              className='flex min-h-0 flex-1 flex-col'
            >
              <div className='flex-1 overflow-y-auto px-6 py-6'>
                <div className='space-y-6'>
                  <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='mb-5'>
                      <h3 className='text-lg font-semibold text-slate-800'>
                        Dados da entrega
                      </h3>
                      <p className='mt-1 text-sm text-slate-500'>
                        Selecione o colaborador e registre a movimentação.
                      </p>
                    </div>

                    <div className='grid grid-cols-1 gap-5'>
                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Colaborador
                        </label>
                        <select
                          name='employeeId'
                          value={deliveryForm.employeeId}
                          onChange={handleDeliveryFormChange}
                          className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500'
                        >
                          <option value=''>
                            {employeesLoading
                              ? 'Carregando colaboradores...'
                              : 'Selecione o colaborador'}
                          </option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {getEmployeeName(employee)} —{' '}
                              {getEmployeeSector(employee)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {deliveryForm.selectedEmployeeData && (
                        <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                          <div className='mb-3 flex items-start justify-between gap-3'>
                            <div>
                              <p className='text-base font-bold text-slate-800'>
                                {getEmployeeName(
                                  deliveryForm.selectedEmployeeData
                                )}
                              </p>
                              <p className='text-sm text-slate-500'>
                                {getEmployeeRole(
                                  deliveryForm.selectedEmployeeData
                                )}{' '}
                                •{' '}
                                {getEmployeeSector(
                                  deliveryForm.selectedEmployeeData
                                )}
                              </p>
                            </div>

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${compatibilityStatus.className}`}
                            >
                              {compatibilityStatus.label}
                            </span>
                          </div>

                          <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                            <div className='rounded-xl border border-slate-200 bg-white p-3'>
                              <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                                Camisa
                              </p>
                              <p className='mt-1 text-sm font-bold text-slate-800'>
                                {getEmployeeShirtSize(
                                  deliveryForm.selectedEmployeeData
                                ) || '-'}
                              </p>
                            </div>

                            <div className='rounded-xl border border-slate-200 bg-white p-3'>
                              <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                                Calça
                              </p>
                              <p className='mt-1 text-sm font-bold text-slate-800'>
                                {getEmployeePantsSize(
                                  deliveryForm.selectedEmployeeData
                                ) || '-'}
                              </p>
                            </div>

                            <div className='rounded-xl border border-slate-200 bg-white p-3'>
                              <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                                Bota
                              </p>
                              <p className='mt-1 text-sm font-bold text-slate-800'>
                                {getEmployeeBootSize(
                                  deliveryForm.selectedEmployeeData
                                ) || '-'}
                              </p>
                            </div>
                          </div>

                          <div className='mt-3 rounded-xl border border-slate-200 bg-white p-3'>
                            <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                              Validação da entrega
                            </p>
                            <p className='mt-1 text-sm font-medium text-slate-800'>
                              Item selecionado: {selectedItem.type} • tamanho{' '}
                              {selectedItem.size}
                            </p>
                            <p className='mt-1 text-sm text-slate-600'>
                              {compatibilityStatus.description}
                            </p>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Setor
                        </label>
                        <input
                          type='text'
                          name='sector'
                          value={deliveryForm.sector}
                          onChange={handleDeliveryFormChange}
                          placeholder='Setor do colaborador'
                          className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Tamanho recomendado
                        </label>
                        <input
                          type='text'
                          value={
                            deliveryForm.recommendedSize ||
                            'Não definido no cadastro'
                          }
                          readOnly
                          className='w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm outline-none'
                        />
                      </div>

                      {deliveryForm.recommendedSize &&
                      selectedItem.size !== deliveryForm.recommendedSize &&
                      !isSingleSizeType(selectedItem.type) ? (
                        <div className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
                          Atenção: o item selecionado está no tamanho{' '}
                          <strong>{selectedItem.size}</strong>, mas o
                          colaborador está cadastrado com tamanho{' '}
                          <strong>{deliveryForm.recommendedSize}</strong>.
                        </div>
                      ) : null}

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Quantidade
                        </label>
                        <input
                          type='number'
                          name='quantity'
                          min='1'
                          value={deliveryForm.quantity}
                          onChange={handleDeliveryFormChange}
                          className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500'
                        />
                      </div>

                      <div>
                        <label className='mb-2 block text-sm font-semibold text-slate-700'>
                          Observações
                        </label>
                        <textarea
                          name='notes'
                          value={deliveryForm.notes}
                          onChange={handleDeliveryFormChange}
                          rows='4'
                          placeholder='Observações da entrega'
                          className='w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500'
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className='border-t border-slate-200 bg-white px-6 py-4'>
                <div className='flex items-center justify-end gap-3'>
                  <button
                    type='button'
                    onClick={closeDeliveryDrawer}
                    className='rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    Cancelar
                  </button>

                  <button
                    type='submit'
                    className='rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700'
                  >
                    Confirmar entrega
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UniformStock;
