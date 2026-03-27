import { ItemFactura } from "./BillingData";
import { Producto } from "../products/ProductsData";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import InvoiceItemRow from "./InvoiceItemRow";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody } from "@/components/ui/table";

interface InvoiceItemsProps {
  items: ItemFactura[];
  productos: Producto[];
  updateItem: (index: number, field: string, value: string | number) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  error?: string;
  onCreateProduct?: (index: number) => void;
  disabled?: boolean;
}

const InvoiceItems = ({
  items,
  productos,
  updateItem,
  addItem,
  removeItem,
  error,
  onCreateProduct,
  disabled = false,
}: InvoiceItemsProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Items de la Factura</h3>
        <Button onClick={addItem} size="sm" type="button" disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Item
        </Button>
      </div>

      {error && (
        <p className="flex items-center gap-1 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Producto</TableHead>
              <TableHead>Descripcion</TableHead>
              <TableHead className="w-[100px]">Cantidad</TableHead>
              <TableHead className="w-[120px]">P. Unitario</TableHead>
              <TableHead className="w-[120px]">Descuento</TableHead>
              <TableHead className="w-[120px]">Subtotal</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <InvoiceItemRow
                key={item.id}
                item={item}
                index={index}
                productos={productos}
                updateItem={updateItem}
                removeItem={removeItem}
                itemCount={items.length}
                onCreateProduct={onCreateProduct}
                disabled={disabled}
              />
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default InvoiceItems;
