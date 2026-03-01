
import { ItemFactura } from "./BillingData";
import { Producto } from "../products/ProductsData";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import ProductSearchCombobox from "./ProductSearchCombobox";
import { TableCell, TableRow } from "@/components/ui/table";

interface InvoiceItemRowProps {
  item: ItemFactura;
  index: number;
  productos: Producto[];
  updateItem: (index: number, field: string, value: any) => void;
  removeItem: (index: number) => void;
  itemCount: number;
  onCreateProduct?: (index: number) => void;
}

const InvoiceItemRow = ({ item, index, productos, updateItem, removeItem, itemCount, onCreateProduct }: InvoiceItemRowProps) => {
  return (
    <TableRow>
      <TableCell>
        <ProductSearchCombobox
          productos={productos}
          value={item.productoId}
          onChange={(newId) => updateItem(index, 'productoId', newId)}
          onCreateProduct={onCreateProduct ? () => onCreateProduct(index) : undefined}
        />
      </TableCell>
      <TableCell>
        <Textarea
          value={item.descripcion}
          onChange={(e) => updateItem(index, 'descripcion', e.target.value)}
          placeholder="Descripción del item"
          className="min-h-[40px] h-10"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={item.cantidad || ''}
          onChange={(e) => updateItem(index, 'cantidad', parseInt(e.target.value) || '')}
          min="1"
          placeholder="Cantidad"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={item.precioUnitario || ''}
          onChange={(e) => updateItem(index, 'precioUnitario', parseFloat(e.target.value) || '')}
          min="0"
          step="0.01"
          placeholder="Precio"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={item.descuento || ''}
          onChange={(e) => updateItem(index, 'descuento', parseFloat(e.target.value) || '')}
          min="0"
          step="0.01"
          placeholder="Descuento"
        />
      </TableCell>
      <TableCell>
        <Input
          value={`Bs. ${item.subtotal.toFixed(2)}`}
          readOnly
          className="bg-gray-50 border-none text-right"
        />
      </TableCell>
      <TableCell className="text-right">
        {itemCount > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeItem(index)}
            className="text-muted-foreground hover:text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
};

export default InvoiceItemRow;
