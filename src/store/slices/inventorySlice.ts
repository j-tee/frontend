import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { toUserFacingError } from '../../utils/errorMessage'
import {
  createCategory,
  createProduct,
  createStockBatch,
  createStockProduct,
  createSupplier,
  deleteStockProduct as deleteStockProductRequest,
  fetchCategories,
  fetchProducts,
  fetchStockBatches,
  fetchStockProducts,
  fetchSuppliers,
  updateStockProduct as updateStockProductRequest,
} from '../../services/inventoryService.js'
import type {
  Category,
  CategoryPayload,
  Product,
  ProductPayload,
  StockBatch,
  StockBatchPayload,
  StockProduct,
  StockProductPayload,
  Supplier,
  SupplierPayload,
} from '../../types/inventory.js'
import type { PaginatedResponse } from '../../types/common.js'
import type { RootState } from '../index.js'

const DEFAULT_ERROR_MESSAGE = "We couldn't complete that request. Please try again."

const extractErrorMessage = (error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string =>
  toUserFacingError(error, { fallback })

type ProductQueryParams = Record<string, unknown> & {
  page?: number
  page_size?: number
}
type LoadParams = ProductQueryParams | undefined

type StockProductQueryParams = Record<string, unknown> & {
  page?: number
  page_size?: number
  stock?: string
  supplier?: string
  has_quantity?: boolean
  search?: string
  ordering?: string
}

type StockLoadParams = StockProductQueryParams | undefined

type AsyncStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

interface InventoryState {
  categories: Category[]
  categoriesStatus: AsyncStatus
  categoriesError: string | null
  products: Product[]
  productsStatus: AsyncStatus
  productsError: string | null
  productsPagination: {
    count: number
    next: string | null
    previous: string | null
  }
  productsPage: number
  productsPageSize: number
  createCategoryStatus: AsyncStatus
  createCategoryError: string | null
  createProductStatus: AsyncStatus
  createProductError: string | null
  stockProducts: StockProduct[]
  stockProductsStatus: AsyncStatus
  stockProductsError: string | null
  stockProductsPagination: {
    count: number
    next: string | null
    previous: string | null
  }
  stockProductsPage: number
  stockProductsPageSize: number
  stockProductsFilters: {
    stock: string | null
    supplier: string | null
    has_quantity: boolean | null
    search: string
    ordering: string | null
  }
  stockBatches: StockBatch[]
  stockBatchesStatus: AsyncStatus
  stockBatchesError: string | null
  suppliers: Supplier[]
  suppliersStatus: AsyncStatus
  suppliersError: string | null
  createStockBatchStatus: AsyncStatus
  createStockBatchError: string | null
  createStockProductStatus: AsyncStatus
  createStockProductError: string | null
  createSupplierStatus: AsyncStatus
  createSupplierError: string | null
  updateStockProductStatus: AsyncStatus
  updateStockProductError: string | null
  deleteStockProductStatus: AsyncStatus
  deleteStockProductError: string | null
}

const initialState: InventoryState = {
  categories: [],
  categoriesStatus: 'idle',
  categoriesError: null,
  products: [],
  productsStatus: 'idle',
  productsError: null,
  productsPagination: {
    count: 0,
    next: null,
    previous: null,
  },
  productsPage: 1,
  productsPageSize: 25,
  createCategoryStatus: 'idle',
  createCategoryError: null,
  createProductStatus: 'idle',
  createProductError: null,
  stockProducts: [],
  stockProductsStatus: 'idle',
  stockProductsError: null,
  stockProductsPagination: {
    count: 0,
    next: null,
    previous: null,
  },
  stockProductsPage: 1,
  stockProductsPageSize: 25,
  stockProductsFilters: {
    stock: null,
    supplier: null,
    has_quantity: null,
    search: '',
    ordering: null,
  },
  stockBatches: [],
  stockBatchesStatus: 'idle',
  stockBatchesError: null,
  suppliers: [],
  suppliersStatus: 'idle',
  suppliersError: null,
  createStockBatchStatus: 'idle',
  createStockBatchError: null,
  createStockProductStatus: 'idle',
  createStockProductError: null,
  createSupplierStatus: 'idle',
  createSupplierError: null,
  updateStockProductStatus: 'idle',
  updateStockProductError: null,
  deleteStockProductStatus: 'idle',
  deleteStockProductError: null,
}

export const loadCategories = createAsyncThunk<Category[]>(
  'inventory/loadCategories',
  async (_, thunkAPI) => {
    try {
      return await fetchCategories()
    } catch (error) {
      return thunkAPI.rejectWithValue(
        extractErrorMessage(error, 'Unable to load categories right now. Please try again in a moment.'),
      )
    }
  },
)

export const loadProducts = createAsyncThunk<PaginatedResponse<Product>, LoadParams>(
  'inventory/loadProducts',
  async (params, thunkAPI) => {
    try {
      return await fetchProducts(params)
    } catch (error) {
      return thunkAPI.rejectWithValue(
        extractErrorMessage(error, 'Unable to load products right now. Please try again in a moment.'),
      )
    }
  },
)

export const addCategory = createAsyncThunk<Category, CategoryPayload>(
  'inventory/addCategory',
  async (payload, thunkAPI) => {
    try {
      return await createCategory(payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(
        extractErrorMessage(error, 'Unable to add this category. Please check the details and try again.'),
      )
    }
  },
)

export const addProduct = createAsyncThunk<Product, ProductPayload>(
  'inventory/addProduct',
  async (payload, thunkAPI) => {
    try {
      return await createProduct(payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(
        extractErrorMessage(error, 'Unable to create this product. Please review the form and try again.'),
      )
    }
  },
)

export const loadStockProducts = createAsyncThunk<PaginatedResponse<StockProduct>, StockLoadParams>(
  'inventory/loadStockProducts',
  async (params, thunkAPI) => {
    try {
      return await fetchStockProducts(params)
    } catch (error) {
      return thunkAPI.rejectWithValue(
        extractErrorMessage(error, 'Unable to create this stock batch right now. Please try again.'),
      )
    }
  },
)

export const loadStockBatches = createAsyncThunk<PaginatedResponse<StockBatch>, Record<string, unknown> | undefined>(
  'inventory/loadStockBatches',
  async (params, thunkAPI) => {
    try {
      return await fetchStockBatches(params)
    } catch (error) {
      return thunkAPI.rejectWithValue(
        extractErrorMessage(error, 'Unable to add this stock product right now. Please try again.'),
      )
    }
  },
)

export const loadSuppliers = createAsyncThunk<PaginatedResponse<Supplier>, Record<string, unknown> | undefined>(
  'inventory/loadSuppliers',
  async (params, thunkAPI) => {
    try {
      return await fetchSuppliers(params)
    } catch (error) {
      return thunkAPI.rejectWithValue(
        extractErrorMessage(error, 'Unable to create this supplier. Please review the details and try again.'),
      )
    }
  },
)

export const addStockBatch = createAsyncThunk<StockBatch, StockBatchPayload>(
  'inventory/addStockBatch',
  async (payload, thunkAPI) => {
    try {
      return await createStockBatch(payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(
        extractErrorMessage(error, "We couldn't load stock products right now. Please try again."),
      )
    }
  },
)

export const addStockProduct = createAsyncThunk<StockProduct, StockProductPayload>(
  'inventory/addStockProduct',
  async (payload, thunkAPI) => {
    try {
      return await createStockProduct(payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(
        extractErrorMessage(error, 'Unable to update this stock product. Please review the details and try again.'),
      )
    }
  },
)

export const editStockProduct = createAsyncThunk<StockProduct, { id: string; payload: Partial<StockProductPayload> }>(
  'inventory/editStockProduct',
  async ({ id, payload }, thunkAPI) => {
    try {
      return await updateStockProductRequest(id, payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(
        extractErrorMessage(error, 'Unable to delete this stock product. Please try again.'),
      )
    }
  },
)

export const removeStockProduct = createAsyncThunk<{ id: string }, { id: string }>(
  'inventory/removeStockProduct',
  async ({ id }, thunkAPI) => {
    try {
      await deleteStockProductRequest(id)
      return { id }
    } catch (error) {
      return thunkAPI.rejectWithValue(
        extractErrorMessage(error, 'Unable to load stock batches at the moment. Please try again.'),
      )
    }
  },
)

export const addSupplier = createAsyncThunk<Supplier, SupplierPayload>(
  'inventory/addSupplier',
  async (payload, thunkAPI) => {
    try {
      return await createSupplier(payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(
        extractErrorMessage(error, 'Unable to load suppliers right now. Please try again.'),
      )
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
    resetCreateStockBatchState: (state: InventoryState) => {
      state.createStockBatchStatus = 'idle'
      state.createStockBatchError = null
    },
    resetCreateStockProductState: (state: InventoryState) => {
      state.createStockProductStatus = 'idle'
      state.createStockProductError = null
    },
    resetCreateSupplierState: (state: InventoryState) => {
      state.createSupplierStatus = 'idle'
      state.createSupplierError = null
    },
    resetEditStockProductState: (state: InventoryState) => {
      state.updateStockProductStatus = 'idle'
      state.updateStockProductError = null
    },
    resetDeleteStockProductState: (state: InventoryState) => {
      state.deleteStockProductStatus = 'idle'
      state.deleteStockProductError = null
    },
    setProductsPage: (state: InventoryState, action: PayloadAction<number>) => {
      const nextPage = Number(action.payload)
      state.productsPage = Number.isNaN(nextPage) || nextPage < 1 ? 1 : nextPage
    },
    setProductsPageSize: (state: InventoryState, action: PayloadAction<number>) => {
      const nextSize = Number(action.payload)
      state.productsPageSize = Number.isNaN(nextSize) || nextSize < 1 ? 25 : nextSize
      if (state.productsPage < 1) {
        state.productsPage = 1
      }
    },
    setStockProductsPage: (state: InventoryState, action: PayloadAction<number>) => {
      const nextPage = Number(action.payload)
      state.stockProductsPage = Number.isNaN(nextPage) || nextPage < 1 ? 1 : nextPage
    },
    setStockProductsPageSize: (state: InventoryState, action: PayloadAction<number>) => {
      const nextSize = Number(action.payload)
      state.stockProductsPageSize = Number.isNaN(nextSize) || nextSize < 1 ? 25 : nextSize
      if (state.stockProductsPage < 1) {
        state.stockProductsPage = 1
      }
    },
    setStockProductsFilters: (
      state: InventoryState,
      action: PayloadAction<{
        stock?: string | null
        supplier?: string | null
        has_quantity?: boolean | null
        search?: string
        ordering?: string | null
      }>,
    ) => {
      const nextFilters = action.payload
      state.stockProductsFilters = {
        stock: nextFilters.stock ?? null,
        supplier: nextFilters.supplier ?? null,
        has_quantity: typeof nextFilters.has_quantity === 'boolean'
          ? nextFilters.has_quantity
          : nextFilters.has_quantity ?? null,
        search: nextFilters.search ?? '',
        ordering: nextFilters.ordering ?? null,
      }
    },
    resetStockProductsFilters: (state: InventoryState) => {
      state.stockProductsFilters = {
        stock: null,
        supplier: null,
        has_quantity: null,
        search: '',
        ordering: null,
      }
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
      .addCase(loadProducts.fulfilled, (state: InventoryState, action) => {
        state.productsStatus = 'succeeded'
        state.products = action.payload.results
        state.productsPagination = {
          count: action.payload.count,
          next: action.payload.next,
          previous: action.payload.previous,
        }
        const requestParams = (action.meta.arg ?? {}) as Record<string, unknown> & {
          page?: number
          page_size?: number
        }
        const requestedPage = Number(requestParams.page)
        const requestedPageSize = Number(requestParams.page_size)
        if (!Number.isNaN(requestedPage) && requestedPage >= 1) {
          state.productsPage = requestedPage
        } else if (state.productsPage < 1) {
          state.productsPage = 1
        }
        if (!Number.isNaN(requestedPageSize) && requestedPageSize > 0) {
          state.productsPageSize = requestedPageSize
        }
        const effectivePageSize = state.productsPageSize > 0 ? state.productsPageSize : 25
        const computedTotalPages = action.payload.count === 0
          ? 1
          : Math.max(1, Math.ceil(action.payload.count / effectivePageSize))
        if (action.payload.count === 0) {
          state.productsPage = 1
        } else if (state.productsPage > computedTotalPages) {
          state.productsPage = computedTotalPages
        }
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
        state.productsPagination.count += 1
      })
      .addCase(addProduct.rejected, (state: InventoryState, action) => {
        state.createProductStatus = 'failed'
        state.createProductError = (action.payload as string) ?? 'Failed to create product.'
      })
      .addCase(addStockBatch.pending, (state: InventoryState) => {
        state.createStockBatchStatus = 'loading'
        state.createStockBatchError = null
      })
      .addCase(addStockBatch.fulfilled, (state: InventoryState, action: PayloadAction<StockBatch>) => {
        state.createStockBatchStatus = 'succeeded'
        state.stockBatches = [action.payload, ...state.stockBatches]
      })
      .addCase(addStockBatch.rejected, (state: InventoryState, action) => {
        state.createStockBatchStatus = 'failed'
        state.createStockBatchError = (action.payload as string) ?? 'Failed to create stock batch.'
      })
      .addCase(addStockProduct.pending, (state: InventoryState) => {
        state.createStockProductStatus = 'loading'
        state.createStockProductError = null
      })
      .addCase(addStockProduct.fulfilled, (state: InventoryState, action: PayloadAction<StockProduct>) => {
        state.createStockProductStatus = 'succeeded'
        state.stockProducts = [action.payload, ...state.stockProducts]
        state.stockProductsPagination.count += 1
      })
      .addCase(addStockProduct.rejected, (state: InventoryState, action) => {
        state.createStockProductStatus = 'failed'
        state.createStockProductError = (action.payload as string) ?? 'Failed to create stock item.'
      })
      .addCase(editStockProduct.pending, (state: InventoryState) => {
        state.updateStockProductStatus = 'loading'
        state.updateStockProductError = null
      })
      .addCase(editStockProduct.fulfilled, (state: InventoryState, action: PayloadAction<StockProduct>) => {
        state.updateStockProductStatus = 'succeeded'
        const index = state.stockProducts.findIndex((item) => item.id === action.payload.id)
        if (index >= 0) {
          state.stockProducts[index] = action.payload
        } else {
          state.stockProducts = [action.payload, ...state.stockProducts]
        }
      })
      .addCase(editStockProduct.rejected, (state: InventoryState, action) => {
        state.updateStockProductStatus = 'failed'
        state.updateStockProductError = (action.payload as string) ?? 'Failed to update stock item.'
      })
      .addCase(removeStockProduct.pending, (state: InventoryState) => {
        state.deleteStockProductStatus = 'loading'
        state.deleteStockProductError = null
      })
      .addCase(removeStockProduct.fulfilled, (state: InventoryState, action) => {
        state.deleteStockProductStatus = 'succeeded'
        const removedId = (action.payload as { id: string }).id
        state.stockProducts = state.stockProducts.filter((item) => item.id !== removedId)
        if (state.stockProductsPagination.count > 0) {
          state.stockProductsPagination.count -= 1
        }
      })
      .addCase(removeStockProduct.rejected, (state: InventoryState, action) => {
        state.deleteStockProductStatus = 'failed'
        state.deleteStockProductError = (action.payload as string) ?? 'Failed to delete stock item.'
      })
      .addCase(addSupplier.pending, (state: InventoryState) => {
        state.createSupplierStatus = 'loading'
        state.createSupplierError = null
      })
      .addCase(addSupplier.fulfilled, (state: InventoryState, action: PayloadAction<Supplier>) => {
        state.createSupplierStatus = 'succeeded'
        state.suppliers = ensureUniqueById([action.payload, ...state.suppliers])
      })
      .addCase(addSupplier.rejected, (state: InventoryState, action) => {
        state.createSupplierStatus = 'failed'
        state.createSupplierError = (action.payload as string) ?? 'Failed to create supplier.'
      })
      .addCase(loadStockProducts.pending, (state: InventoryState) => {
        state.stockProductsStatus = 'loading'
        state.stockProductsError = null
      })
      .addCase(loadStockProducts.fulfilled, (state: InventoryState, action) => {
        state.stockProductsStatus = 'succeeded'
        state.stockProducts = action.payload.results
        state.stockProductsPagination = {
          count: action.payload.count,
          next: action.payload.next,
          previous: action.payload.previous,
        }
        const requestParams = (action.meta.arg ?? {}) as StockProductQueryParams
        const requestedPage = Number(requestParams.page)
        const requestedPageSize = Number(requestParams.page_size)
        if (!Number.isNaN(requestedPage) && requestedPage >= 1) {
          state.stockProductsPage = requestedPage
        } else if (state.stockProductsPage < 1) {
          state.stockProductsPage = 1
        }
        if (!Number.isNaN(requestedPageSize) && requestedPageSize > 0) {
          state.stockProductsPageSize = requestedPageSize
        }
        const effectivePageSize = state.stockProductsPageSize > 0 ? state.stockProductsPageSize : 25
        const computedTotalPages = action.payload.count === 0
          ? 1
          : Math.max(1, Math.ceil(action.payload.count / effectivePageSize))
        if (action.payload.count === 0) {
          state.stockProductsPage = 1
        } else if (state.stockProductsPage > computedTotalPages) {
          state.stockProductsPage = computedTotalPages
        }
        state.stockProductsFilters = {
          stock: requestParams.stock ?? null,
          supplier: requestParams.supplier ?? null,
          has_quantity: typeof requestParams.has_quantity === 'boolean'
            ? requestParams.has_quantity
            : requestParams.has_quantity ?? null,
          search: requestParams.search ?? '',
          ordering: requestParams.ordering ?? null,
        }
      })
      .addCase(loadStockProducts.rejected, (state: InventoryState, action) => {
        state.stockProductsStatus = 'failed'
        state.stockProductsError = (action.payload as string) ?? 'Failed to load stock products.'
      })
      .addCase(loadStockBatches.pending, (state: InventoryState) => {
        state.stockBatchesStatus = 'loading'
        state.stockBatchesError = null
      })
      .addCase(loadStockBatches.fulfilled, (state: InventoryState, action) => {
        state.stockBatchesStatus = 'succeeded'
        state.stockBatches = action.payload.results ?? []
      })
      .addCase(loadStockBatches.rejected, (state: InventoryState, action) => {
        state.stockBatchesStatus = 'failed'
        state.stockBatchesError = (action.payload as string) ?? 'Failed to load stock batches.'
      })
      .addCase(loadSuppliers.pending, (state: InventoryState) => {
        state.suppliersStatus = 'loading'
        state.suppliersError = null
      })
      .addCase(loadSuppliers.fulfilled, (state: InventoryState, action) => {
        state.suppliersStatus = 'succeeded'
        state.suppliers = action.payload.results ?? []
      })
      .addCase(loadSuppliers.rejected, (state: InventoryState, action) => {
        state.suppliersStatus = 'failed'
        state.suppliersError = (action.payload as string) ?? 'Failed to load suppliers.'
      })
  },
})

export const {
  resetCreateCategoryState,
  resetCreateProductState,
  resetCreateStockBatchState,
  resetCreateStockProductState,
  resetCreateSupplierState,
  resetEditStockProductState,
  resetDeleteStockProductState,
  setProductsPage,
  setProductsPageSize,
  setStockProductsPage,
  setStockProductsPageSize,
  setStockProductsFilters,
  resetStockProductsFilters,
} = inventorySlice.actions

export const selectInventoryState = (state: RootState) => state.inventory
export const selectCategories = (state: RootState) => state.inventory.categories
export const selectProducts = (state: RootState) => state.inventory.products
export const selectCategoriesStatus = (state: RootState) => state.inventory.categoriesStatus
export const selectCategoriesError = (state: RootState) => state.inventory.categoriesError
export const selectProductsStatus = (state: RootState) => state.inventory.productsStatus
export const selectProductsError = (state: RootState) => state.inventory.productsError
export const selectProductsPagination = (state: RootState) => state.inventory.productsPagination
export const selectProductsPage = (state: RootState) => state.inventory.productsPage
export const selectProductsPageSize = (state: RootState) => state.inventory.productsPageSize
export const selectCreateCategoryStatus = (state: RootState) => state.inventory.createCategoryStatus
export const selectCreateCategoryError = (state: RootState) => state.inventory.createCategoryError
export const selectCreateProductStatus = (state: RootState) => state.inventory.createProductStatus
export const selectCreateProductError = (state: RootState) => state.inventory.createProductError
export const selectCreateStockBatchStatus = (state: RootState) => state.inventory.createStockBatchStatus
export const selectCreateStockBatchError = (state: RootState) => state.inventory.createStockBatchError
export const selectCreateStockProductStatus = (state: RootState) => state.inventory.createStockProductStatus
export const selectCreateStockProductError = (state: RootState) => state.inventory.createStockProductError
export const selectCreateSupplierStatus = (state: RootState) => state.inventory.createSupplierStatus
export const selectCreateSupplierError = (state: RootState) => state.inventory.createSupplierError
export const selectEditStockProductStatus = (state: RootState) => state.inventory.updateStockProductStatus
export const selectEditStockProductError = (state: RootState) => state.inventory.updateStockProductError
export const selectDeleteStockProductStatus = (state: RootState) => state.inventory.deleteStockProductStatus
export const selectDeleteStockProductError = (state: RootState) => state.inventory.deleteStockProductError
export const selectStockProducts = (state: RootState) => state.inventory.stockProducts
export const selectStockProductsStatus = (state: RootState) => state.inventory.stockProductsStatus
export const selectStockProductsError = (state: RootState) => state.inventory.stockProductsError
export const selectStockProductsPagination = (state: RootState) => state.inventory.stockProductsPagination
export const selectStockProductsPage = (state: RootState) => state.inventory.stockProductsPage
export const selectStockProductsPageSize = (state: RootState) => state.inventory.stockProductsPageSize
export const selectStockProductsFilters = (state: RootState) => state.inventory.stockProductsFilters
export const selectStockBatches = (state: RootState) => state.inventory.stockBatches
export const selectStockBatchesStatus = (state: RootState) => state.inventory.stockBatchesStatus
export const selectStockBatchesError = (state: RootState) => state.inventory.stockBatchesError
export const selectSuppliers = (state: RootState) => state.inventory.suppliers
export const selectSuppliersStatus = (state: RootState) => state.inventory.suppliersStatus
export const selectSuppliersError = (state: RootState) => state.inventory.suppliersError

export default inventorySlice.reducer
