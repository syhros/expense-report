export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB');
};

export const formatRelativeDate = (dateString: string | null): string => {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
};

const formatWeightInKg = (weightInGrams: number): string => {
  const weightInKg = weightInGrams / 1000;
  return `${weightInKg.toFixed(2)} kg`;
};

export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'delivered':
    case 'fully received':
    case 'complete':
    case 'collected':
      return 'bg-green-900 text-green-300';
    case 'in transit':
    case 'ordered':
      return 'bg-blue-900 text-blue-300';
    case 'processing':
    case 'partially delivered':
      return 'bg-yellow-900 text-yellow-300';
    case 'pending':
      return 'bg-orange-900 text-orange-300';
    case 'cancelled':
      return 'bg-red-900 text-red-300';
    default:
      return 'bg-gray-700 text-gray-300';
  }
};

export { formatWeightInKg };

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};