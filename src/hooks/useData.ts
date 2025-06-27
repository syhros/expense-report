import { useState, useEffect } from 'react';
import { 
  getSuppliers, 
  getASINs, 
  getASINsWithMetrics,
  getTransactions, 
  getTransactionsWithMetrics,
  getBudgets, 
  getAmazonTransactions,
  getDashboardMetrics,
  getSupplierMetrics,
  getCurrentBudget,
  getCategories
} from '../services/database';
import { 
  Supplier, 
  ASIN, 
  ASINWithMetrics,
  Transaction, 
  TransactionWithMetrics,
  Budget, 
  AmazonTransaction,
  DashboardMetrics,
  SupplierMetrics,
  Category
} from '../types/database';

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await getSuppliers();
      setSuppliers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  return { suppliers, loading, error, refetch: fetchSuppliers };
};

export const useASINs = () => {
  const [asins, setAsins] = useState<ASIN[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchASINs = async () => {
    try {
      setLoading(true);
      const data = await getASINs();
      setAsins(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ASINs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchASINs();
  }, []);

  return { asins, loading, error, refetch: fetchASINs };
};

export const useASINsWithMetrics = () => {
  const [asins, setAsins] = useState<ASINWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchASINs = async () => {
    try {
      setLoading(true);
      const data = await getASINsWithMetrics();
      setAsins(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ASINs with metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchASINs();
  }, []);

  return { asins, loading, error, refetch: fetchASINs };
};

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await getTransactions();
      setTransactions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return { transactions, loading, error, refetch: fetchTransactions };
};

export const useTransactionsWithMetrics = () => {
  const [transactions, setTransactions] = useState<TransactionWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await getTransactionsWithMetrics();
      setTransactions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions with metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return { transactions, loading, error, refetch: fetchTransactions };
};

export const useBudgets = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [currentBudget, setCurrentBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const [allBudgets, current] = await Promise.all([
        getBudgets(),
        getCurrentBudget()
      ]);
      setBudgets(allBudgets);
      setCurrentBudget(current);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  return { budgets, currentBudget, loading, error, refetch: fetchBudgets };
};

export const useAmazonTransactions = () => {
  const [amazonTransactions, setAmazonTransactions] = useState<AmazonTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAmazonTransactions = async () => {
    try {
      setLoading(true);
      const data = await getAmazonTransactions();
      setAmazonTransactions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Amazon transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmazonTransactions();
  }, []);

  return { amazonTransactions, loading, error, refetch: fetchAmazonTransactions };
};

export const useDashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await getDashboardMetrics();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return { metrics, loading, error, refetch: fetchMetrics };
};

export const useSupplierMetrics = () => {
  const [supplierMetrics, setSupplierMetrics] = useState<SupplierMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSupplierMetrics = async () => {
    try {
      setLoading(true);
      const data = await getSupplierMetrics();
      setSupplierMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch supplier metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplierMetrics();
  }, []);

  return { supplierMetrics, loading, error, refetch: fetchSupplierMetrics };
};

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return { categories, loading, error, refetch: fetchCategories };
};