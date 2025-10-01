import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { isAxiosError } from 'axios'
import {
  createCategory,
  createProduct,
  fetchCategories,
  fetchProducts,
} from '../../services/inventoryService.js'
import type {
  Category,
  CategoryPayload,
  Product,
  ProductPayload,
} from '../../types/inventory.js'
import type { RootState } from '../index.js'

const extractErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        return error.response.data
      }
      try {
        return JSON.stringify(error.response.data)
      } catch {
        return error.message
      }
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Request failed. Please try again.'
}

type LoadParams = Record<string, unknown> | undefined

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

interface InventoryState {
  categories: Category[]
  categoriesStatus: AsyncStatus
  categoriesError: string | null
  products: Product[]
  productsStatus: AsyncStatus
  productsError: string | null
  createCategoryStatus: AsyncStatus
  createCategoryError: string | null
  createProductStatus: AsyncStatus
  createProductError: string | null
}

const initialState: InventoryState = {
  categories: [],
  categoriesStatus: 'idle',
  categoriesError: null,
  products: [],
  productsStatus: 'idle',
  productsError: null,
  createCategoryStatus: 'idle',
  createCategoryError: null,
  createProductStatus: 'idle',
  createProductError: null,
}

export const loadCategories = createAsyncThunk<Category[]>(
  'inventory/loadCategories',
  async (_, thunkAPI) => {
    try {
      return await fetchCategories()
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const loadProducts = createAsyncThunk<Product[], LoadParams>(
  'inventory/loadProducts',
  async (params, thunkAPI) => {
    try {
      return await fetchProducts(params)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const addCategory = createAsyncThunk<Category, CategoryPayload>(
  'inventory/addCategory',
  async (payload, thunkAPI) => {
    try {
      return await createCategory(payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

export const addProduct = createAsyncThunk<Product, ProductPayload>(
  'inventory/addProduct',
  async (payload, thunkAPI) => {
    try {
      return await createProduct(payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractErrorMessage(error))
    }
  },
)

const ensureUniqueById = <T extends { id: string }>(items: T[]): T[] => {
  const map = new Map<string, T>()
  for (const item of items) {
    map.set(item.id, item)
  }
  return Array.from(map.values())
}

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    resetCreateCategoryState: (state: InventoryState) => {
      state.createCategoryStatus = 'idle'
      state.createCategoryError = null
    },
    resetCreateProductState: (state: InventoryState) => {
      state.createProductStatus = 'idle'
      state.createProductError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCategories.pending, (state: InventoryState) => {
        state.categoriesStatus = 'loading'
        state.categoriesError = null
      })
      .addCase(loadCategories.fulfilled, (state: InventoryState, action: PayloadAction<Category[]>) => {
        state.categoriesStatus = 'succeeded'
        state.categories = action.payload
      })
      .addCase(loadCategories.rejected, (state: InventoryState, action) => {
        state.categoriesStatus = 'failed'
        state.categoriesError = (action.payload as string) ?? 'Failed to load categories.'
      })
      .addCase(loadProducts.pending, (state: InventoryState) => {
        state.productsStatus = 'loading'
        state.productsError = null
      })
      .addCase(loadProducts.fulfilled, (state: InventoryState, action: PayloadAction<Product[]>) => {
        state.productsStatus = 'succeeded'
        state.products = action.payload
      })
      .addCase(loadProducts.rejected, (state: InventoryState, action) => {
        state.productsStatus = 'failed'
        state.productsError = (action.payload as string) ?? 'Failed to load products.'
      })
      .addCase(addCategory.pending, (state: InventoryState) => {
        state.createCategoryStatus = 'loading'
        state.createCategoryError = null
      })
      .addCase(addCategory.fulfilled, (state: InventoryState, action: PayloadAction<Category>) => {
        state.createCategoryStatus = 'succeeded'
        state.categories = ensureUniqueById([action.payload, ...state.categories])
      })
      .addCase(addCategory.rejected, (state: InventoryState, action) => {
        state.createCategoryStatus = 'failed'
        state.createCategoryError = (action.payload as string) ?? 'Failed to create category.'
      })
      .addCase(addProduct.pending, (state: InventoryState) => {
        state.createProductStatus = 'loading'
        state.createProductError = null
      })
      .addCase(addProduct.fulfilled, (state: InventoryState, action: PayloadAction<Product>) => {
        state.createProductStatus = 'succeeded'
        state.products = ensureUniqueById([action.payload, ...state.products])
      })
      .addCase(addProduct.rejected, (state: InventoryState, action) => {
        state.createProductStatus = 'failed'
        state.createProductError = (action.payload as string) ?? 'Failed to create product.'
      })
  },
})

export const { resetCreateCategoryState, resetCreateProductState } = inventorySlice.actions

export const selectInventoryState = (state: RootState) => state.inventory
export const selectCategories = (state: RootState) => state.inventory.categories
export const selectProducts = (state: RootState) => state.inventory.products
export const selectCategoriesStatus = (state: RootState) => state.inventory.categoriesStatus
export const selectCategoriesError = (state: RootState) => state.inventory.categoriesError
export const selectProductsStatus = (state: RootState) => state.inventory.productsStatus
export const selectProductsError = (state: RootState) => state.inventory.productsError
export const selectCreateCategoryStatus = (state: RootState) => state.inventory.createCategoryStatus
export const selectCreateCategoryError = (state: RootState) => state.inventory.createCategoryError
export const selectCreateProductStatus = (state: RootState) => state.inventory.createProductStatus
export const selectCreateProductError = (state: RootState) => state.inventory.createProductError

export default inventorySlice.reducer
