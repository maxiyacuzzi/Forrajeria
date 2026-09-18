export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cash_registers: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          counted_amount: number | null
          difference: number | null
          expected_amount: number | null
          id: string
          note: string | null
          opened_at: string
          opened_by: string | null
          opening_amount: number
          org_id: string
          status: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          counted_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          note?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          org_id: string
          status?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          counted_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          note?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          org_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_registers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_product_loyalty: {
        Row: {
          customer_id: string
          id: string
          last_purchase_at: string | null
          last_purchase_unit: string | null
          org_id: string
          product_id: string
          progress_qty: number
          updated_at: string
        }
        Insert: {
          customer_id: string
          id?: string
          last_purchase_at?: string | null
          last_purchase_unit?: string | null
          org_id: string
          product_id: string
          progress_qty?: number
          updated_at?: string
        }
        Update: {
          customer_id?: string
          id?: string
          last_purchase_at?: string | null
          last_purchase_unit?: string | null
          org_id?: string
          product_id?: string
          progress_qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_product_loyalty_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_loyalty_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_loyalty_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          dni: string | null
          id: string
          is_default: boolean
          name: string
          org_id: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          dni?: string | null
          id?: string
          is_default?: boolean
          name: string
          org_id: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          dni?: string | null
          id?: string
          is_default?: boolean
          name?: string
          org_id?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_payments: {
        Row: {
          amount: number
          cash_register_id: string | null
          created_at: string
          created_by: string | null
          expense_id: string
          id: string
          note: string | null
          org_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
        }
        Insert: {
          amount: number
          cash_register_id?: string | null
          created_at?: string
          created_by?: string | null
          expense_id: string
          id?: string
          note?: string | null
          org_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
        }
        Update: {
          amount?: number
          cash_register_id?: string | null
          created_at?: string
          created_by?: string | null
          expense_id?: string
          id?: string
          note?: string | null
          org_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
        }
        Relationships: [
          {
            foreignKeyName: "expense_payments_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          cash_register_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          org_id: string
          paid_amount: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          supplier_id: string | null
        }
        Insert: {
          amount: number
          cash_register_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          org_id: string
          paid_amount?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          cash_register_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          org_id?: string
          paid_amount?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_suppliers: {
        Row: {
          created_at: string
          id: string
          org_id: string
          product_id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          product_id: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          product_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_suppliers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          bag_price: number | null
          brand: string | null
          category_id: string | null
          controls_expiration: boolean
          conversion_factor: number | null
          cost_price: number
          created_at: string
          earns_loyalty: boolean
          id: string
          image_url: string | null
          is_active: boolean
          margin_bolsa_pct: number
          margin_suelto_pct: number
          min_stock_alert: number | null
          name: string
          org_id: string
          purchase_unit_label: string
          sale_price: number
          sale_unit_label: string
          stock_open_qty: number
          stock_qty: number
          unit_type: Database["public"]["Enums"]["product_unit_type"]
          updated_at: string
        }
        Insert: {
          bag_price?: number | null
          brand?: string | null
          category_id?: string | null
          controls_expiration?: boolean
          conversion_factor?: number | null
          cost_price?: number
          created_at?: string
          earns_loyalty?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          margin_bolsa_pct?: number
          margin_suelto_pct?: number
          min_stock_alert?: number | null
          name: string
          org_id: string
          purchase_unit_label?: string
          sale_price?: number
          sale_unit_label?: string
          stock_open_qty?: number
          stock_qty?: number
          unit_type?: Database["public"]["Enums"]["product_unit_type"]
          updated_at?: string
        }
        Update: {
          bag_price?: number | null
          brand?: string | null
          category_id?: string | null
          controls_expiration?: boolean
          conversion_factor?: number | null
          cost_price?: number
          created_at?: string
          earns_loyalty?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          margin_bolsa_pct?: number
          margin_suelto_pct?: number
          min_stock_alert?: number | null
          name?: string
          org_id?: string
          purchase_unit_label?: string
          sale_price?: number
          sale_unit_label?: string
          stock_open_qty?: number
          stock_qty?: number
          unit_type?: Database["public"]["Enums"]["product_unit_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          org_id: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          loyalty_discount: number
          product_id: string
          quantity: number
          sale_id: string
          subtotal: number | null
          unit: string
          unit_price: number
        }
        Insert: {
          id?: string
          loyalty_discount?: number
          product_id: string
          quantity: number
          sale_id: string
          subtotal?: number | null
          unit: string
          unit_price?: number
        }
        Update: {
          id?: string
          loyalty_discount?: number
          product_id?: string
          quantity?: number
          sale_id?: string
          subtotal?: number | null
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cash_register_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          discount_amount: number
          id: string
          is_loyalty_reward: boolean
          note: string | null
          org_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          subtotal_amount: number
          surcharge_amount: number
          total_amount: number
        }
        Insert: {
          cash_register_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          discount_amount?: number
          id?: string
          is_loyalty_reward?: boolean
          note?: string | null
          org_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          subtotal_amount?: number
          surcharge_amount?: number
          total_amount?: number
        }
        Update: {
          cash_register_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          discount_amount?: number
          id?: string
          is_loyalty_reward?: boolean
          note?: string | null
          org_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          subtotal_amount?: number
          surcharge_amount?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          org_id: string
          product_id: string
          quantity: number
          reference_id: string | null
          supplier_id: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
          unit: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          org_id: string
          product_id: string
          quantity: number
          reference_id?: string | null
          supplier_id?: string | null
          type: Database["public"]["Enums"]["stock_movement_type"]
          unit: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          org_id?: string
          product_id?: string
          quantity?: number
          reference_id?: string | null
          supplier_id?: string | null
          type?: Database["public"]["Enums"]["stock_movement_type"]
          unit?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          org_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          org_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          org_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_org_id: { Args: never; Returns: string }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      close_cash_register: {
        Args: {
          p_cash_register_id: string
          p_counted_amount: number
          p_note?: string
        }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          counted_amount: number | null
          difference: number | null
          expected_amount: number | null
          id: string
          note: string | null
          opened_at: string
          opened_by: string | null
          opening_amount: number
          org_id: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "cash_registers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_org_with_owner: {
        Args: { org_name: string }
        Returns: {
          created_at: string
          id: string
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_sale:
        | {
            Args: { p_customer_id: string; p_items: Json; p_note?: string }
            Returns: {
              cash_register_id: string | null
              created_at: string
              created_by: string | null
              customer_id: string
              discount_amount: number
              id: string
              is_loyalty_reward: boolean
              note: string | null
              org_id: string
              payment_method: Database["public"]["Enums"]["payment_method"]
              subtotal_amount: number
              surcharge_amount: number
              total_amount: number
            }
            SetofOptions: {
              from: "*"
              to: "sales"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_customer_id: string
              p_items: Json
              p_note?: string
              p_payment_method?: Database["public"]["Enums"]["payment_method"]
            }
            Returns: {
              cash_register_id: string | null
              created_at: string
              created_by: string | null
              customer_id: string
              discount_amount: number
              id: string
              is_loyalty_reward: boolean
              note: string | null
              org_id: string
              payment_method: Database["public"]["Enums"]["payment_method"]
              subtotal_amount: number
              surcharge_amount: number
              total_amount: number
            }
            SetofOptions: {
              from: "*"
              to: "sales"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      open_cash_register: {
        Args: { p_note?: string; p_opening_amount: number }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          counted_amount: number | null
          difference: number | null
          expected_amount: number | null
          id: string
          note: string | null
          opened_at: string
          opened_by: string | null
          opening_amount: number
          org_id: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "cash_registers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_expense_payment: {
        Args: {
          p_amount: number
          p_expense_id: string
          p_note?: string
          p_payment_method?: Database["public"]["Enums"]["payment_method"]
        }
        Returns: {
          amount: number
          cash_register_id: string | null
          created_at: string
          created_by: string | null
          expense_id: string
          id: string
          note: string | null
          org_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
        }
        SetofOptions: {
          from: "*"
          to: "expense_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      payment_method: "efectivo" | "transferencia" | "tarjeta" | "posnet_mp"
      product_unit_type: "simple" | "fraccionable" | "no_fraccionable"
      stock_movement_type:
        | "ingreso_compra"
        | "egreso_venta"
        | "fraccionamiento_apertura"
        | "fraccionamiento_merma"
        | "mezcla_insumo"
        | "mezcla_producto"
        | "ajuste_manual"
        | "rotura_humedad"
      user_role: "owner" | "vendedor" | "deposito"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      payment_method: ["efectivo", "transferencia", "tarjeta", "posnet_mp"],
      product_unit_type: ["simple", "fraccionable", "no_fraccionable"],
      stock_movement_type: [
        "ingreso_compra",
        "egreso_venta",
        "fraccionamiento_apertura",
        "fraccionamiento_merma",
        "mezcla_insumo",
        "mezcla_producto",
        "ajuste_manual",
        "rotura_humedad",
      ],
      user_role: ["owner", "vendedor", "deposito"],
    },
  },
} as const

