export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activos_fijos: {
        Row: {
          categoria: string | null
          codigo: string
          costo_inicial: number
          created_at: string
          descripcion: string | null
          estado: string | null
          fecha_adquisicion: string
          id: string
          metodo_depreciacion: string | null
          nombre: string
          ubicacion: string | null
          updated_at: string
          user_id: string
          valor_residual: number | null
          vida_util_anos: number
        }
        Insert: {
          categoria?: string | null
          codigo: string
          costo_inicial?: number
          created_at?: string
          descripcion?: string | null
          estado?: string | null
          fecha_adquisicion: string
          id?: string
          metodo_depreciacion?: string | null
          nombre: string
          ubicacion?: string | null
          updated_at?: string
          user_id: string
          valor_residual?: number | null
          vida_util_anos: number
        }
        Update: {
          categoria?: string | null
          codigo?: string
          costo_inicial?: number
          created_at?: string
          descripcion?: string | null
          estado?: string | null
          fecha_adquisicion?: string
          id?: string
          metodo_depreciacion?: string | null
          nombre?: string
          ubicacion?: string | null
          updated_at?: string
          user_id?: string
          valor_residual?: number | null
          vida_util_anos?: number
        }
        Relationships: []
      }
      anticipos: {
        Row: {
          cliente_id: string | null
          created_at: string
          empleado_id: string | null
          estado: string | null
          fecha: string
          id: string
          monto: number
          monto_descontado: number | null
          motivo: string
          proveedor_id: string | null
          saldo_pendiente: number
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          empleado_id?: string | null
          estado?: string | null
          fecha: string
          id?: string
          monto: number
          monto_descontado?: number | null
          motivo: string
          proveedor_id?: string | null
          saldo_pendiente: number
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          empleado_id?: string | null
          estado?: string | null
          fecha?: string
          id?: string
          monto?: number
          monto_descontado?: number | null
          motivo?: string
          proveedor_id?: string | null
          saldo_pendiente?: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anticipos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anticipos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anticipos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      asientos_contables: {
        Row: {
          concepto: string
          created_at: string | null
          debe: number | null
          estado: string | null
          fecha: string
          haber: number | null
          id: string
          numero: string
          referencia: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          concepto: string
          created_at?: string | null
          debe?: number | null
          estado?: string | null
          fecha: string
          haber?: number | null
          id?: string
          numero: string
          referencia?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          concepto?: string
          created_at?: string | null
          debe?: number | null
          estado?: string | null
          fecha?: string
          haber?: number | null
          id?: string
          numero?: string
          referencia?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      categorias_productos: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      centros_costo: {
        Row: {
          activo: boolean | null
          codigo: string
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          tipo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          tipo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          tipo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clasificador_actividades_2025: {
        Row: {
          categoria: string
          codigo: string
          created_at: string | null
          descripcion: string
          fecha_implementacion: string | null
          id: string
          sector: string | null
          vigente: boolean | null
        }
        Insert: {
          categoria: string
          codigo: string
          created_at?: string | null
          descripcion: string
          fecha_implementacion?: string | null
          id?: string
          sector?: string | null
          vigente?: boolean | null
        }
        Update: {
          categoria?: string
          codigo?: string
          created_at?: string | null
          descripcion?: string
          fecha_implementacion?: string | null
          id?: string
          sector?: string | null
          vigente?: boolean | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          activo: boolean | null
          created_at: string | null
          direccion: string | null
          email: string | null
          id: string
          nit: string
          nombre: string
          telefono: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nit: string
          nombre: string
          telefono?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nit?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      compras: {
        Row: {
          created_at: string | null
          descuento_total: number | null
          estado: string | null
          fecha: string
          fecha_vencimiento: string | null
          id: string
          iva: number | null
          monto_pagado: number | null
          numero: string
          observaciones: string | null
          proveedor_id: string | null
          saldo_pendiente: number | null
          subtotal: number | null
          tipo_pago: string | null
          total: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descuento_total?: number | null
          estado?: string | null
          fecha: string
          fecha_vencimiento?: string | null
          id?: string
          iva?: number | null
          monto_pagado?: number | null
          numero: string
          observaciones?: string | null
          proveedor_id?: string | null
          saldo_pendiente?: number | null
          subtotal?: number | null
          tipo_pago?: string | null
          total?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          descuento_total?: number | null
          estado?: string | null
          fecha?: string
          fecha_vencimiento?: string | null
          id?: string
          iva?: number | null
          monto_pagado?: number | null
          numero?: string
          observaciones?: string | null
          proveedor_id?: string | null
          saldo_pendiente?: number | null
          subtotal?: number | null
          tipo_pago?: string | null
          total?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      comprobantes_integrados: {
        Row: {
          codigo_control: string | null
          created_at: string
          cuf: string | null
          cufd: string | null
          estado: string | null
          estado_sin: string | null
          fecha: string
          id: string
          iva: number
          nit: string
          numero_comprobante: string
          razon_social: string
          subtotal: number
          tipo_comprobante: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          codigo_control?: string | null
          created_at?: string
          cuf?: string | null
          cufd?: string | null
          estado?: string | null
          estado_sin?: string | null
          fecha: string
          id?: string
          iva?: number
          nit: string
          numero_comprobante: string
          razon_social: string
          subtotal?: number
          tipo_comprobante: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          codigo_control?: string | null
          created_at?: string
          cuf?: string | null
          cufd?: string | null
          estado?: string | null
          estado_sin?: string | null
          fecha?: string
          id?: string
          iva?: number
          nit?: string
          numero_comprobante?: string
          razon_social?: string
          subtotal?: number
          tipo_comprobante?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      configuracion_tributaria: {
        Row: {
          actividad_economica: string
          codigo_actividad: string
          created_at: string
          id: string
          it_tasa: number
          iue_tasa: number
          iva_tasa: number
          nit_empresa: string
          razon_social: string
          rc_it_tasa: number
          rc_iva_tasa: number
          regimen_tributario: string
          tipo_cambio_usd: number
          ufv_actual: number
          updated_at: string
        }
        Insert: {
          actividad_economica: string
          codigo_actividad: string
          created_at?: string
          id?: string
          it_tasa?: number
          iue_tasa?: number
          iva_tasa?: number
          nit_empresa: string
          razon_social: string
          rc_it_tasa?: number
          rc_iva_tasa?: number
          regimen_tributario?: string
          tipo_cambio_usd?: number
          ufv_actual?: number
          updated_at?: string
        }
        Update: {
          actividad_economica?: string
          codigo_actividad?: string
          created_at?: string
          id?: string
          it_tasa?: number
          iue_tasa?: number
          iva_tasa?: number
          nit_empresa?: string
          razon_social?: string
          rc_it_tasa?: number
          rc_iva_tasa?: number
          regimen_tributario?: string
          tipo_cambio_usd?: number
          ufv_actual?: number
          updated_at?: string
        }
        Relationships: []
      }
      control_existencias_ice: {
        Row: {
          created_at: string | null
          estado: string | null
          exportaciones: number | null
          fecha_presentacion: string | null
          id: string
          importaciones: number | null
          impuesto_ice: number | null
          partida_arancelaria: string | null
          periodo: string
          produccion: number | null
          producto_codigo: string
          producto_descripcion: string
          stock_final: number | null
          stock_inicial: number | null
          tipo_formulario: string
          updated_at: string | null
          user_id: string
          ventas_internas: number | null
        }
        Insert: {
          created_at?: string | null
          estado?: string | null
          exportaciones?: number | null
          fecha_presentacion?: string | null
          id?: string
          importaciones?: number | null
          impuesto_ice?: number | null
          partida_arancelaria?: string | null
          periodo: string
          produccion?: number | null
          producto_codigo: string
          producto_descripcion: string
          stock_final?: number | null
          stock_inicial?: number | null
          tipo_formulario: string
          updated_at?: string | null
          user_id: string
          ventas_internas?: number | null
        }
        Update: {
          created_at?: string | null
          estado?: string | null
          exportaciones?: number | null
          fecha_presentacion?: string | null
          id?: string
          importaciones?: number | null
          impuesto_ice?: number | null
          partida_arancelaria?: string | null
          periodo?: string
          produccion?: number | null
          producto_codigo?: string
          producto_descripcion?: string
          stock_final?: number | null
          stock_inicial?: number | null
          tipo_formulario?: string
          updated_at?: string | null
          user_id?: string
          ventas_internas?: number | null
        }
        Relationships: []
      }
      cuentas_asientos: {
        Row: {
          asiento_id: string | null
          codigo_cuenta: string
          created_at: string | null
          debe: number | null
          haber: number | null
          id: string
          nombre_cuenta: string
        }
        Insert: {
          asiento_id?: string | null
          codigo_cuenta: string
          created_at?: string | null
          debe?: number | null
          haber?: number | null
          id?: string
          nombre_cuenta: string
        }
        Update: {
          asiento_id?: string | null
          codigo_cuenta?: string
          created_at?: string | null
          debe?: number | null
          haber?: number | null
          id?: string
          nombre_cuenta?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_asientos_asiento_id_fkey"
            columns: ["asiento_id"]
            isOneToOne: false
            referencedRelation: "asientos_contables"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas_bancarias: {
        Row: {
          activa: boolean | null
          banco: string
          codigo_cuenta_contable: string | null
          created_at: string
          id: string
          moneda: string | null
          nombre: string
          nombre_cuenta_contable: string | null
          numero_cuenta: string
          saldo: number | null
          tipo_cuenta: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activa?: boolean | null
          banco: string
          codigo_cuenta_contable?: string | null
          created_at?: string
          id?: string
          moneda?: string | null
          nombre: string
          nombre_cuenta_contable?: string | null
          numero_cuenta: string
          saldo?: number | null
          tipo_cuenta?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activa?: boolean | null
          banco?: string
          codigo_cuenta_contable?: string | null
          created_at?: string
          id?: string
          moneda?: string | null
          nombre?: string
          nombre_cuenta_contable?: string | null
          numero_cuenta?: string
          saldo?: number | null
          tipo_cuenta?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conciliacion_bancaria_items: {
        Row: {
          asiento_id: string | null
          conciliacion_id: string
          conciliado: boolean
          created_at: string
          descripcion: string
          estado: string
          fecha: string
          id: string
          monto: number
          movimiento_bancario_id: string | null
          origen: string
          referencia: string | null
          requiere_ajuste: boolean
          tipo_partida: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asiento_id?: string | null
          conciliacion_id: string
          conciliado?: boolean
          created_at?: string
          descripcion: string
          estado?: string
          fecha: string
          id?: string
          monto?: number
          movimiento_bancario_id?: string | null
          origen: string
          referencia?: string | null
          requiere_ajuste?: boolean
          tipo_partida: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asiento_id?: string | null
          conciliacion_id?: string
          conciliado?: boolean
          created_at?: string
          descripcion?: string
          estado?: string
          fecha?: string
          id?: string
          monto?: number
          movimiento_bancario_id?: string | null
          origen?: string
          referencia?: string | null
          requiere_ajuste?: boolean
          tipo_partida?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conciliacion_bancaria_items_asiento_id_fkey"
            columns: ["asiento_id"]
            isOneToOne: false
            referencedRelation: "asientos_contables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliacion_bancaria_items_conciliacion_id_fkey"
            columns: ["conciliacion_id"]
            isOneToOne: false
            referencedRelation: "conciliaciones_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conciliacion_bancaria_items_movimiento_bancario_id_fkey"
            columns: ["movimiento_bancario_id"]
            isOneToOne: false
            referencedRelation: "movimientos_bancarios"
            referencedColumns: ["id"]
          },
        ]
      }
      conciliaciones_bancarias: {
        Row: {
          created_at: string
          cuenta_bancaria_id: string
          diferencia: number
          estado: string
          fecha_corte: string
          id: string
          observaciones: string | null
          saldo_banco: number
          saldo_libros: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cuenta_bancaria_id: string
          diferencia?: number
          estado?: string
          fecha_corte: string
          id?: string
          observaciones?: string | null
          saldo_banco?: number
          saldo_libros?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cuenta_bancaria_id?: string
          diferencia?: number
          estado?: string
          fecha_corte?: string
          id?: string
          observaciones?: string | null
          saldo_banco?: number
          saldo_libros?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conciliaciones_bancarias_cuenta_bancaria_id_fkey"
            columns: ["cuenta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "cuentas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      cumplimiento_normativo_2025: {
        Row: {
          created_at: string | null
          descripcion: string
          estado: string | null
          fecha_implementacion: string | null
          fecha_vigencia: string
          id: string
          norma_rnd: string
          observaciones: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descripcion: string
          estado?: string | null
          fecha_implementacion?: string | null
          fecha_vigencia: string
          id?: string
          norma_rnd: string
          observaciones?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string
          estado?: string | null
          fecha_implementacion?: string | null
          fecha_vigencia?: string
          id?: string
          norma_rnd?: string
          observaciones?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      customer_access_log: {
        Row: {
          accessed_by: string | null
          action: string
          customer_id: string | null
          id: string
          ip_address: string | null
          timestamp: string | null
          user_agent: string | null
        }
        Insert: {
          accessed_by?: string | null
          action: string
          customer_id?: string | null
          id?: string
          ip_address?: string | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Update: {
          accessed_by?: string | null
          action?: string
          customer_id?: string | null
          id?: string
          ip_address?: string | null
          timestamp?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_access_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      declaraciones_tributarias: {
        Row: {
          beneficio_iva_cero: boolean | null
          codigo_actividad_caeb: string | null
          created_at: string
          estado: string | null
          fecha_presentacion: string | null
          fecha_vencimiento: string
          formulario_tipo: string | null
          gestion: number
          id: string
          mes: number | null
          modalidad_facturacion: string | null
          monto_base: number | null
          monto_impuesto: number | null
          monto_pagado: number | null
          normativa_aplicable: string | null
          observaciones: string | null
          periodo: string
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          beneficio_iva_cero?: boolean | null
          codigo_actividad_caeb?: string | null
          created_at?: string
          estado?: string | null
          fecha_presentacion?: string | null
          fecha_vencimiento: string
          formulario_tipo?: string | null
          gestion: number
          id?: string
          mes?: number | null
          modalidad_facturacion?: string | null
          monto_base?: number | null
          monto_impuesto?: number | null
          monto_pagado?: number | null
          normativa_aplicable?: string | null
          observaciones?: string | null
          periodo: string
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          beneficio_iva_cero?: boolean | null
          codigo_actividad_caeb?: string | null
          created_at?: string
          estado?: string | null
          fecha_presentacion?: string | null
          fecha_vencimiento?: string
          formulario_tipo?: string | null
          gestion?: number
          id?: string
          mes?: number | null
          modalidad_facturacion?: string | null
          monto_base?: number | null
          monto_impuesto?: number | null
          monto_pagado?: number | null
          normativa_aplicable?: string | null
          observaciones?: string | null
          periodo?: string
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      depreciaciones_activos: {
        Row: {
          activo_id: string
          created_at: string
          depreciacion_acumulada: number
          fecha_depreciacion: string
          id: string
          periodo: string
          user_id: string
          valor_depreciacion: number
          valor_neto: number
        }
        Insert: {
          activo_id: string
          created_at?: string
          depreciacion_acumulada?: number
          fecha_depreciacion: string
          id?: string
          periodo: string
          user_id: string
          valor_depreciacion: number
          valor_neto: number
        }
        Update: {
          activo_id?: string
          created_at?: string
          depreciacion_acumulada?: number
          fecha_depreciacion?: string
          id?: string
          periodo?: string
          user_id?: string
          valor_depreciacion?: number
          valor_neto?: number
        }
        Relationships: [
          {
            foreignKeyName: "depreciaciones_activos_activo_id_fkey"
            columns: ["activo_id"]
            isOneToOne: false
            referencedRelation: "activos_fijos"
            referencedColumns: ["id"]
          },
        ]
      }
      empleados: {
        Row: {
          apellidos: string
          beneficios: string[] | null
          cargo: string
          ci: string
          created_at: string | null
          departamento: string
          direccion: string | null
          email: string | null
          estado: string | null
          estado_civil: string | null
          fecha_ingreso: string
          fecha_nacimiento: string
          genero: string | null
          id: string
          nombres: string
          numero_empleado: string
          salario_base: number
          telefono: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          apellidos: string
          beneficios?: string[] | null
          cargo: string
          ci: string
          created_at?: string | null
          departamento: string
          direccion?: string | null
          email?: string | null
          estado?: string | null
          estado_civil?: string | null
          fecha_ingreso: string
          fecha_nacimiento: string
          genero?: string | null
          id?: string
          nombres: string
          numero_empleado: string
          salario_base?: number
          telefono?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          apellidos?: string
          beneficios?: string[] | null
          cargo?: string
          ci?: string
          created_at?: string | null
          departamento?: string
          direccion?: string | null
          email?: string | null
          estado?: string | null
          estado_civil?: string | null
          fecha_ingreso?: string
          fecha_nacimiento?: string
          genero?: string | null
          id?: string
          nombres?: string
          numero_empleado?: string
          salario_base?: number
          telefono?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      facilidades_pago: {
        Row: {
          created_at: string | null
          cuotas: number
          estado: string | null
          fecha_aprobacion: string | null
          fecha_solicitud: string
          fecha_vencimiento: string
          garantia: string | null
          id: string
          monto_cuota: number
          monto_deuda: number
          numero_facilidad: string
          observaciones: string | null
          pago_inicial: number
          tasa_interes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cuotas: number
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_solicitud: string
          fecha_vencimiento: string
          garantia?: string | null
          id?: string
          monto_cuota: number
          monto_deuda: number
          numero_facilidad: string
          observaciones?: string | null
          pago_inicial: number
          tasa_interes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cuotas?: number
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_solicitud?: string
          fecha_vencimiento?: string
          garantia?: string | null
          id?: string
          monto_cuota?: number
          monto_deuda?: number
          numero_facilidad?: string
          observaciones?: string | null
          pago_inicial?: number
          tasa_interes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      facilidades_pago_2025: {
        Row: {
          created_at: string | null
          estado: string | null
          fecha_aprobacion: string | null
          fecha_solicitud: string
          fecha_vencimiento: string
          id: string
          monto_cuota: number
          monto_deuda: number
          monto_inicial: number | null
          normativa_aplicable: string | null
          numero_cuotas: number
          numero_facilidad: string
          observaciones: string | null
          tasa_interes: number | null
          tipo_facilidad: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_solicitud: string
          fecha_vencimiento: string
          id?: string
          monto_cuota: number
          monto_deuda: number
          monto_inicial?: number | null
          normativa_aplicable?: string | null
          numero_cuotas: number
          numero_facilidad: string
          observaciones?: string | null
          tasa_interes?: number | null
          tipo_facilidad: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_solicitud?: string
          fecha_vencimiento?: string
          id?: string
          monto_cuota?: number
          monto_deuda?: number
          monto_inicial?: number | null
          normativa_aplicable?: string | null
          numero_cuotas?: number
          numero_facilidad?: string
          observaciones?: string | null
          tasa_interes?: number | null
          tipo_facilidad?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      facturas: {
        Row: {
          cliente_id: string | null
          codigo_control: string | null
          created_at: string | null
          cuf: string | null
          cufd: string | null
          descuento_total: number | null
          estado: string | null
          estado_sin: string | null
          fecha: string
          fecha_vencimiento: string | null
          id: string
          iva: number | null
          numero: string
          observaciones: string | null
          punto_venta: number | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          codigo_control?: string | null
          created_at?: string | null
          cuf?: string | null
          cufd?: string | null
          descuento_total?: number | null
          estado?: string | null
          estado_sin?: string | null
          fecha: string
          fecha_vencimiento?: string | null
          id?: string
          iva?: number | null
          numero: string
          observaciones?: string | null
          punto_venta?: number | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          codigo_control?: string | null
          created_at?: string | null
          cuf?: string | null
          cufd?: string | null
          descuento_total?: number | null
          estado?: string | null
          estado_sin?: string | null
          fecha?: string
          fecha_vencimiento?: string | null
          id?: string
          iva?: number | null
          numero?: string
          observaciones?: string | null
          punto_venta?: number | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_access_log: {
        Row: {
          id: string
          ip_address: unknown
          operation: string
          record_id: string | null
          risk_score: number | null
          sensitive_fields: Json | null
          session_id: string | null
          table_name: string
          timestamp: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: unknown
          operation: string
          record_id?: string | null
          risk_score?: number | null
          sensitive_fields?: Json | null
          session_id?: string | null
          table_name: string
          timestamp?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: unknown
          operation?: string
          record_id?: string | null
          risk_score?: number | null
          sensitive_fields?: Json | null
          session_id?: string | null
          table_name?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      financial_security_summary: {
        Row: {
          access_date: string
          average_risk_score: number | null
          created_at: string | null
          high_risk_accesses: number | null
          id: string
          low_risk_accesses: number | null
          medium_risk_accesses: number | null
          operations_performed: string | null
          tables_accessed: string | null
          total_accesses: number | null
          unique_users_accessing: number | null
          updated_at: string | null
        }
        Insert: {
          access_date: string
          average_risk_score?: number | null
          created_at?: string | null
          high_risk_accesses?: number | null
          id?: string
          low_risk_accesses?: number | null
          medium_risk_accesses?: number | null
          operations_performed?: string | null
          tables_accessed?: string | null
          total_accesses?: number | null
          unique_users_accessing?: number | null
          updated_at?: string | null
        }
        Update: {
          access_date?: string
          average_risk_score?: number | null
          created_at?: string | null
          high_risk_accesses?: number | null
          id?: string
          low_risk_accesses?: number | null
          medium_risk_accesses?: number | null
          operations_performed?: string | null
          tables_accessed?: string | null
          total_accesses?: number | null
          unique_users_accessing?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      items_compras: {
        Row: {
          cantidad: number
          compra_id: string | null
          costo_unitario: number
          created_at: string | null
          descripcion: string
          id: string
          producto_id: string | null
          subtotal: number
        }
        Insert: {
          cantidad: number
          compra_id?: string | null
          costo_unitario: number
          created_at?: string | null
          descripcion: string
          id?: string
          producto_id?: string | null
          subtotal: number
        }
        Update: {
          cantidad?: number
          compra_id?: string | null
          costo_unitario?: number
          created_at?: string | null
          descripcion?: string
          id?: string
          producto_id?: string | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_compras_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_compras_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      items_comprobantes_integrados: {
        Row: {
          cantidad: number
          codigo: string
          comprobante_id: string
          created_at: string
          descripcion: string
          descuento: number | null
          id: string
          precio_unitario: number
          producto_id: string | null
          subtotal: number
        }
        Insert: {
          cantidad: number
          codigo: string
          comprobante_id: string
          created_at?: string
          descripcion: string
          descuento?: number | null
          id?: string
          precio_unitario: number
          producto_id?: string | null
          subtotal: number
        }
        Update: {
          cantidad?: number
          codigo?: string
          comprobante_id?: string
          created_at?: string
          descripcion?: string
          descuento?: number | null
          id?: string
          precio_unitario?: number
          producto_id?: string | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_comprobantes_integrados_comprobante_id_fkey"
            columns: ["comprobante_id"]
            isOneToOne: false
            referencedRelation: "comprobantes_integrados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_comprobantes_integrados_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      items_facturas: {
        Row: {
          cantidad: number
          codigo: string
          codigo_sin: string | null
          created_at: string | null
          descripcion: string
          descuento: number | null
          factura_id: string | null
          id: string
          precio_unitario: number
          producto_id: string | null
          subtotal: number
        }
        Insert: {
          cantidad: number
          codigo: string
          codigo_sin?: string | null
          created_at?: string | null
          descripcion: string
          descuento?: number | null
          factura_id?: string | null
          id?: string
          precio_unitario: number
          producto_id?: string | null
          subtotal: number
        }
        Update: {
          cantidad?: number
          codigo?: string
          codigo_sin?: string | null
          created_at?: string | null
          descripcion?: string
          descuento?: number | null
          factura_id?: string | null
          id?: string
          precio_unitario?: number
          producto_id?: string | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_facturas_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_facturas_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      items_presupuestos: {
        Row: {
          categoria: string
          concepto: string
          created_at: string | null
          ejecutado: number | null
          id: string
          porcentaje_ejecucion: number | null
          presupuestado: number
          presupuesto_id: string | null
          updated_at: string | null
          variacion: number | null
        }
        Insert: {
          categoria: string
          concepto: string
          created_at?: string | null
          ejecutado?: number | null
          id?: string
          porcentaje_ejecucion?: number | null
          presupuestado?: number
          presupuesto_id?: string | null
          updated_at?: string | null
          variacion?: number | null
        }
        Update: {
          categoria?: string
          concepto?: string
          created_at?: string | null
          ejecutado?: number | null
          id?: string
          porcentaje_ejecucion?: number | null
          presupuestado?: number
          presupuesto_id?: string | null
          updated_at?: string | null
          variacion?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_presupuestos_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_bancarios: {
        Row: {
          beneficiario: string | null
          created_at: string
          cuenta_bancaria_id: string
          detalle_importacion: Json | null
          descripcion: string
          fecha: string
          id: string
          monto: number
          naturaleza_movimiento: string
          numero_comprobante: string | null
          origen_registro: string
          saldo_actual: number | null
          saldo_anterior: number | null
          tipo: string
          user_id: string
        }
        Insert: {
          beneficiario?: string | null
          created_at?: string
          cuenta_bancaria_id: string
          detalle_importacion?: Json | null
          descripcion: string
          fecha: string
          id?: string
          monto: number
          naturaleza_movimiento?: string
          numero_comprobante?: string | null
          origen_registro?: string
          saldo_actual?: number | null
          saldo_anterior?: number | null
          tipo: string
          user_id: string
        }
        Update: {
          beneficiario?: string | null
          created_at?: string
          cuenta_bancaria_id?: string
          detalle_importacion?: Json | null
          descripcion?: string
          fecha?: string
          id?: string
          monto?: number
          naturaleza_movimiento?: string
          numero_comprobante?: string | null
          origen_registro?: string
          saldo_actual?: number | null
          saldo_anterior?: number | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_bancarios_cuenta_bancaria_id_fkey"
            columns: ["cuenta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "cuentas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_inventario: {
        Row: {
          cantidad: number
          compra_id: string | null
          costo_unitario: number | null
          created_at: string | null
          factura_id: string | null
          fecha: string
          id: string
          observaciones: string | null
          producto_id: string | null
          stock_actual: number | null
          stock_anterior: number | null
          tipo: string
          user_id: string | null
        }
        Insert: {
          cantidad: number
          compra_id?: string | null
          costo_unitario?: number | null
          created_at?: string | null
          factura_id?: string | null
          fecha: string
          id?: string
          observaciones?: string | null
          producto_id?: string | null
          stock_actual?: number | null
          stock_anterior?: number | null
          tipo: string
          user_id?: string | null
        }
        Update: {
          cantidad?: number
          compra_id?: string | null
          costo_unitario?: number | null
          created_at?: string | null
          factura_id?: string | null
          fecha?: string
          id?: string
          observaciones?: string | null
          producto_id?: string | null
          stock_actual?: number | null
          stock_anterior?: number | null
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      normativas_2025: {
        Row: {
          categoria: string
          contenido: Json | null
          created_at: string | null
          descripcion: string | null
          estado: string | null
          fecha_emision: string
          fecha_vencimiento: string | null
          fecha_vigencia: string | null
          id: string
          rnd_numero: string
          titulo: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          categoria: string
          contenido?: Json | null
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha_emision: string
          fecha_vencimiento?: string | null
          fecha_vigencia?: string | null
          id?: string
          rnd_numero: string
          titulo: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          categoria?: string
          contenido?: Json | null
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha_emision?: string
          fecha_vencimiento?: string | null
          fecha_vigencia?: string | null
          id?: string
          rnd_numero?: string
          titulo?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pagos: {
        Row: {
          compra_id: string | null
          created_at: string
          estado: string | null
          factura_id: string | null
          fecha: string
          id: string
          metodo_pago: string | null
          monto: number
          numero_comprobante: string | null
          observaciones: string | null
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          compra_id?: string | null
          created_at?: string
          estado?: string | null
          factura_id?: string | null
          fecha: string
          id?: string
          metodo_pago?: string | null
          monto: number
          numero_comprobante?: string | null
          observaciones?: string | null
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          compra_id?: string | null
          created_at?: string
          estado?: string | null
          factura_id?: string | null
          fecha?: string
          id?: string
          metodo_pago?: string | null
          monto?: number
          numero_comprobante?: string | null
          observaciones?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_cuentas: {
        Row: {
          activa: boolean | null
          codigo: string
          created_at: string
          cuenta_padre: string | null
          id: string
          naturaleza: string
          nivel: number | null
          nombre: string
          saldo: number | null
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activa?: boolean | null
          codigo: string
          created_at?: string
          cuenta_padre?: string | null
          id?: string
          naturaleza: string
          nivel?: number | null
          nombre: string
          saldo?: number | null
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activa?: boolean | null
          codigo?: string
          created_at?: string
          cuenta_padre?: string | null
          id?: string
          naturaleza?: string
          nivel?: number | null
          nombre?: string
          saldo?: number | null
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_cuentas_2025: {
        Row: {
          activa: boolean
          codigo: string
          created_at: string
          cuenta_padre: string | null
          descripcion: string | null
          id: string
          nivel: number
          nombre: string
          tipo: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          codigo: string
          created_at?: string
          cuenta_padre?: string | null
          descripcion?: string | null
          id?: string
          nivel: number
          nombre: string
          tipo: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          codigo?: string
          created_at?: string
          cuenta_padre?: string | null
          descripcion?: string | null
          id?: string
          nivel?: number
          nombre?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_cuentas_2025_cuenta_padre_fkey"
            columns: ["cuenta_padre"]
            isOneToOne: false
            referencedRelation: "plan_cuentas_2025"
            referencedColumns: ["codigo"]
          },
        ]
      }
      presupuestos: {
        Row: {
          created_at: string | null
          descripcion: string | null
          estado: string | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          nombre: string
          periodo: string
          responsable: string | null
          total_ejecutado: number | null
          total_presupuestado: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha_fin: string
          fecha_inicio: string
          id?: string
          nombre: string
          periodo: string
          responsable?: string | null
          total_ejecutado?: number | null
          total_presupuestado?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          nombre?: string
          periodo?: string
          responsable?: string | null
          total_ejecutado?: number | null
          total_presupuestado?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      productos: {
        Row: {
          activo: boolean | null
          categoria_id: string | null
          codigo: string
          codigo_sin: string | null
          costo_unitario: number
          created_at: string | null
          descripcion: string | null
          id: string
          imagen_storage_path: string | null
          imagen_url: string | null
          nombre: string
          precio_compra: number
          precio_venta: number
          stock_actual: number | null
          stock_minimo: number | null
          unidad_medida: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activo?: boolean | null
          categoria_id?: string | null
          codigo: string
          codigo_sin?: string | null
          costo_unitario?: number
          created_at?: string | null
          descripcion?: string | null
          id?: string
          imagen_storage_path?: string | null
          imagen_url?: string | null
          nombre: string
          precio_compra?: number
          precio_venta?: number
          stock_actual?: number | null
          stock_minimo?: number | null
          unidad_medida?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activo?: boolean | null
          categoria_id?: string | null
          codigo?: string
          codigo_sin?: string | null
          costo_unitario?: number
          created_at?: string | null
          descripcion?: string | null
          id?: string
          imagen_storage_path?: string | null
          imagen_url?: string | null
          nombre?: string
          precio_compra?: number
          precio_venta?: number
          stock_actual?: number | null
          stock_minimo?: number | null
          unidad_medida?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_productos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          empresa: string | null
          id: string
          permisos: string[]
          telefono: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          empresa?: string | null
          id: string
          permisos?: string[]
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          empresa?: string | null
          id?: string
          permisos?: string[]
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          activo: boolean | null
          codigo: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          id: string
          nit: string
          nombre: string
          saldo_deuda: number | null
          telefono: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nit: string
          nombre: string
          saldo_deuda?: number | null
          telefono?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          nit?: string
          nombre?: string
          saldo_deuda?: number | null
          telefono?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      registro_bancarizacion: {
        Row: {
          banco: string
          created_at: string | null
          declarado: boolean | null
          estado: string | null
          fecha_limite_declaracion: string
          fecha_transaccion: string
          id: string
          monto_transaccion: number
          nit_proveedor: string
          numero_documento_pago: string
          numero_factura: string
          observaciones: string | null
          periodo: string
          razon_social_proveedor: string
          tipo_documento_pago: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          banco: string
          created_at?: string | null
          declarado?: boolean | null
          estado?: string | null
          fecha_limite_declaracion: string
          fecha_transaccion: string
          id?: string
          monto_transaccion: number
          nit_proveedor: string
          numero_documento_pago: string
          numero_factura: string
          observaciones?: string | null
          periodo: string
          razon_social_proveedor: string
          tipo_documento_pago?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          banco?: string
          created_at?: string | null
          declarado?: boolean | null
          estado?: string | null
          fecha_limite_declaracion?: string
          fecha_transaccion?: string
          id?: string
          monto_transaccion?: number
          nit_proveedor?: string
          numero_documento_pago?: string
          numero_factura?: string
          observaciones?: string | null
          periodo?: string
          razon_social_proveedor?: string
          tipo_documento_pago?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      ventas_credito: {
        Row: {
          cliente_id: string
          created_at: string
          estado: string | null
          factura_id: string
          fecha_vencimiento: string
          fecha_venta: string
          id: string
          interes_mora: number | null
          monto_pagado: number | null
          monto_total: number
          plazo_dias: number
          saldo_pendiente: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          estado?: string | null
          factura_id: string
          fecha_vencimiento: string
          fecha_venta: string
          id?: string
          interes_mora?: number | null
          monto_pagado?: number | null
          monto_total: number
          plazo_dias: number
          saldo_pendiente: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          estado?: string | null
          factura_id?: string
          fecha_vencimiento?: string
          fecha_venta?: string
          id?: string
          interes_mora?: number | null
          monto_pagado?: number | null
          monto_total?: number
          plazo_dias?: number
          saldo_pendiente?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ventas_credito_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_credito_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_employee_safe_data: {
        Args: {
          employee_record: Database["public"]["Tables"]["empleados"]["Row"]
        }
        Returns: {
          apellidos: string
          cargo: string
          departamento: string
          estado: string
          fecha_ingreso: string
          id: string
          nombres: string
          numero_empleado: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mask_sensitive_financial_data: {
        Args: { data: string; mask_type?: string }
        Returns: string
      }
      update_financial_security_summary: { Args: never; Returns: undefined }
      validate_financial_access: {
        Args: {
          data_owner_id: string
          operation_type: string
          requesting_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
