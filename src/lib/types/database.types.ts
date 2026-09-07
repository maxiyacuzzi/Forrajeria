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
      fractionings: {
        Row: {
          actual_qty: number | null
          bags_opened: number
          closed_at: string | null
          closed_by: string | null
          expected_qty: number
          id: string
          opened_at: string
          opened_by: string | null
          org_id: string
          product_id: string
          shrinkage_qty: number | null
          status: string
        }
        Insert: {
          actual_qty?: number | null
          bags_opened: number
          closed_at?: string | null
          closed_by?: string | null
          expected_qty: number
          id?: string
          opened_at?: string
          opened_by?: string | null
          org_id: string
          product_id: string
          shrinkage_qty?: number | null
          status?: string
        }
        Update: {
          actual_qty?: number | null
          bags_opened?: number
          closed_at?: string | null
          closed_by?: string | null
          expected_qty?: number
          id?: string
          opened_at?: string
          opened_by?: string | null
          org_id?: string
          product_id?: string
          shrinkage_qty?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fractionings_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fractionings_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fractionings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fractionings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category_id: string | null
          controls_expiration: boolean
          conversion_factor: number | null
          cost_price: number
          created_at: string
          id: string
          is_active: boolean
          min_stock_alert: number | null
          name: string
          org_id: string
          purchase_unit_label: string
          reference_weight: number | null
          sale_unit_label: string
          stock_open_qty: number
          stock_qty: number
          unit_type: Database["public"]["Enums"]["product_unit_type"]
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          controls_expiration?: boolean
          conversion_factor?: number | null
          cost_price?: number
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock_alert?: number | null
          name: string
          org_id: string
          purchase_unit_label?: string
          reference_weight?: number | null
          sale_unit_label?: string
          stock_open_qty?: number
          stock_qty?: number
          unit_type?: Database["public"]["Enums"]["product_unit_type"]
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          controls_expiration?: boolean
          conversion_factor?: number | null
          cost_price?: number
          created_at?: string
          id?: string
          is_active?: boolean
          min_stock_alert?: number | null
          name?: string
          org_id?: string
          purchase_unit_label?: string
          reference_weight?: number | null
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
          type: Database["public"]["Enums"]["stock_movement_type"]
          unit: string
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
          type: Database["public"]["Enums"]["stock_movement_type"]
          unit: string
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
          type?: Database["public"]["Enums"]["stock_movement_type"]
          unit?: string
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
      close_fractioning: {
        Args: { p_actual_qty: number; p_fractioning_id: string }
        Returns: {
          actual_qty: number | null
          bags_opened: number
          closed_at: string | null
          closed_by: string | null
          expected_qty: number
          id: string
          opened_at: string
          opened_by: string | null
          org_id: string
          product_id: string
          shrinkage_qty: number | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "fractionings"
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
      open_fractioning: {
        Args: { p_bags_opened: number; p_product_id: string }
        Returns: {
          actual_qty: number | null
          bags_opened: number
          closed_at: string | null
          closed_by: string | null
          expected_qty: number
          id: string
          opened_at: string
          opened_by: string | null
          org_id: string
          product_id: string
          shrinkage_qty: number | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "fractionings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      product_unit_type: "simple" | "fraccionable" | "peso_variable"
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
      product_unit_type: ["simple", "fraccionable", "peso_variable"],
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

