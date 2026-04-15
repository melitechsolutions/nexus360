import { Trash2, Plus } from "lucide-react";

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total?: number;
}

interface QuoteLineItemsProps {
  items: LineItem[];
  onItemsChange: (items: LineItem[]) => void;
  editable?: boolean;
  showActions?: boolean;
}

export function QuoteLineItems({
  items,
  onItemsChange,
  editable = false,
  showActions = true,
}: QuoteLineItemsProps) {
  const calculateItemTotal = (item: LineItem) => {
    return item.quantity * item.unitPrice;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    items.forEach((item) => {
      const itemTotal = calculateItemTotal(item);
      subtotal += itemTotal;
      taxAmount += itemTotal * (item.taxRate / 100);
    });

    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  };

  const totals = calculateTotals();

  const handleItemChange = (
    index: number,
    field: keyof LineItem,
    value: any
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onItemsChange(newItems);
  };

  const handleAddItem = () => {
    onItemsChange([
      ...items,
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  if (!editable) {
    // Read-only display
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  Qty
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  Tax
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.description}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    ${item.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {item.taxRate}%
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                    ${calculateItemTotal(item).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full md:w-80 space-y-2">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-700">Subtotal:</span>
              <span className="font-semibold text-gray-900">
                ${totals.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-700">Tax:</span>
              <span className="font-semibold text-gray-900">
                ${totals.taxAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-2 bg-blue-50 px-4 rounded-lg">
              <span className="font-bold text-gray-900">Total:</span>
              <span className="font-bold text-blue-600 text-lg">
                ${totals.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Editable display
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
        {showActions && (
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Plus size={18} />
            Add Item
          </button>
        )}
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 border border-gray-200 rounded-lg"
          >
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600">Description</label>
              <input
                type="text"
                value={item.description}
                onChange={(e) =>
                  handleItemChange(index, "description", e.target.value)
                }
                placeholder="Item description"
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Qty</label>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  handleItemChange(index, "quantity", parseFloat(e.target.value))
                }
                min="1"
                step="0.01"
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Unit Price</label>
              <input
                type="number"
                value={item.unitPrice}
                onChange={(e) =>
                  handleItemChange(index, "unitPrice", parseFloat(e.target.value))
                }
                min="0"
                step="0.01"
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Tax %</label>
              <input
                type="number"
                value={item.taxRate}
                onChange={(e) =>
                  handleItemChange(index, "taxRate", parseFloat(e.target.value))
                }
                min="0"
                max="100"
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end justify-between gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-600">Total</label>
                <div className="text-sm font-semibold text-gray-900">
                  ${calculateItemTotal(item).toFixed(2)}
                </div>
              </div>
              {showActions && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full md:w-80 space-y-2 p-4 bg-blue-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>${totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax:</span>
            <span>${totals.taxAmount.toFixed(2)}</span>
          </div>
          <div className="border-t border-blue-200 pt-2 flex justify-between font-bold">
            <span>Total:</span>
            <span className="text-blue-600 text-lg">
              ${totals.total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
