import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Spinner from 'react-bootstrap/Spinner'
import Table from 'react-bootstrap/Table'
import { useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../hooks/index.js'
import {
  addCategory,
  addProduct,
  loadCategories,
  loadProducts,
  resetCreateCategoryState,
  resetCreateProductState,
  setProductsPage,
  setProductsPageSize,
  selectCategories,
  selectCategoriesError,
  selectCategoriesStatus,
  selectCreateCategoryError,
  selectCreateCategoryStatus,
  selectCreateProductError,
  selectCreateProductStatus,
  selectProducts,
  selectProductsError,
  selectProductsPage,
  selectProductsPageSize,
  selectProductsPagination,
  selectProductsStatus,
} from '../../../store/slices/inventorySlice.js'

interface CategoryFormState {
  name: string
  description: string
}

interface ProductFormState {
  name: string
  sku: string
  category: string
  unit: string
  description: string
  is_active: boolean
}

const initialCategoryForm: CategoryFormState = {
  name: '',
  description: '',
}

const initialProductForm: ProductFormState = {
  name: '',
  sku: '',
  category: '',
  unit: 'unit',
  description: '',
  is_active: true,
}

const InventoryPage = () => {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const categories = useAppSelector(selectCategories)
  const categoriesStatus = useAppSelector(selectCategoriesStatus)
  const categoriesError = useAppSelector(selectCategoriesError)
  const products = useAppSelector(selectProducts)
  const productsStatus = useAppSelector(selectProductsStatus)
  const productsError = useAppSelector(selectProductsError)
  const productsPagination = useAppSelector(selectProductsPagination)
  const productsPage = useAppSelector(selectProductsPage)
  const productsPageSize = useAppSelector(selectProductsPageSize)
  const createCategoryStatus = useAppSelector(selectCreateCategoryStatus)
  const createCategoryError = useAppSelector(selectCreateCategoryError)
  const createProductStatus = useAppSelector(selectCreateProductStatus)
  const createProductError = useAppSelector(selectCreateProductError)

  const [categoryForm, setCategoryForm] = useState(initialCategoryForm)
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null)
  const [categorySuccessMessage, setCategorySuccessMessage] = useState<string | null>(null)
  const [productForm, setProductForm] = useState(initialProductForm)
  const [productFormError, setProductFormError] = useState<string | null>(null)
  const [productSuccessMessage, setProductSuccessMessage] = useState<string | null>(null)
  const productNameRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (categoriesStatus === 'idle') {
      void dispatch(loadCategories())
    }
  }, [categoriesStatus, dispatch])

  useEffect(() => {
    if (productsStatus === 'idle') {
      void dispatch(loadProducts({ page: productsPage, page_size: productsPageSize }))
    }
  }, [dispatch, productsPage, productsPageSize, productsStatus])

  useEffect(() => {
    if (createCategoryStatus === 'succeeded') {
      setCategoryForm(initialCategoryForm)
      setCategoryFormError(null)
      setCategorySuccessMessage('Category created successfully.')
      dispatch(resetCreateCategoryState())
    }
  }, [createCategoryStatus, dispatch])

  useEffect(() => {
    if (createProductStatus === 'succeeded') {
      setProductForm(initialProductForm)
      setProductFormError(null)
      setProductSuccessMessage('Product created successfully.')
      dispatch(resetCreateProductState())
    }
  }, [createProductStatus, dispatch])

  useEffect(() => {
    if (!categorySuccessMessage) return
    const timeoutId = window.setTimeout(() => setCategorySuccessMessage(null), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [categorySuccessMessage])

  useEffect(() => {
    if (!productSuccessMessage) return
    const timeoutId = window.setTimeout(() => setProductSuccessMessage(null), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [productSuccessMessage])

  const handleCategorySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = categoryForm.name.trim()
    if (!trimmedName) {
      setCategoryFormError('Category name is required.')
      return
    }

    setCategoryFormError(null)
    setCategorySuccessMessage(null)
    void dispatch(
      addCategory({
        name: trimmedName,
        description: categoryForm.description.trim() || undefined,
      }),
    )
  }

  const handleProductSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!productForm.name.trim()) {
      setProductFormError('Product name is required.')
      return
    }

    if (!productForm.sku.trim()) {
      setProductFormError('SKU is required.')
      return
    }

    if (!productForm.category) {
      setProductFormError('Select a category for this product.')
      return
    }

    const trimmedUnit = productForm.unit.trim()
    if (!trimmedUnit) {
      setProductFormError('Unit is required.')
      return
    }

    setProductFormError(null)
    setProductSuccessMessage(null)

    void dispatch(
      addProduct({
        name: productForm.name.trim(),
        sku: productForm.sku.trim(),
        category: productForm.category,
        unit: trimmedUnit,
        description: productForm.description.trim() || undefined,
        is_active: productForm.is_active,
      }),
    )
  }

  const isLoadingCategories = categoriesStatus === 'loading'
  const isLoadingProducts = productsStatus === 'loading'
  const isCreatingCategory = createCategoryStatus === 'loading'
  const isCreatingProduct = createProductStatus === 'loading'

  const totalProducts = productsPagination.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalProducts / productsPageSize))
  const showingFrom = totalProducts === 0 ? 0 : (productsPage - 1) * productsPageSize + 1
  const showingTo = totalProducts === 0
    ? 0
    : Math.min(productsPage * productsPageSize, totalProducts)

  const handleRefreshProducts = () => {
    void dispatch(loadProducts({ page: productsPage, page_size: productsPageSize }))
  }

  const handlePreviousPage = () => {
    if (productsPage <= 1 || isLoadingProducts) return
    const previousPage = productsPage - 1
    dispatch(setProductsPage(previousPage))
    void dispatch(loadProducts({ page: previousPage, page_size: productsPageSize }))
  }

  const handleNextPage = () => {
    if (productsPage >= totalPages || isLoadingProducts || totalProducts === 0) return
    const nextPage = productsPage + 1
    dispatch(setProductsPage(nextPage))
    void dispatch(loadProducts({ page: nextPage, page_size: productsPageSize }))
  }

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSize = Number(event.target.value)
    if (Number.isNaN(nextSize) || nextSize <= 0 || nextSize === productsPageSize) return
    dispatch(setProductsPageSize(nextSize))
    dispatch(setProductsPage(1))
    void dispatch(loadProducts({ page: 1, page_size: nextSize }))
  }

  useEffect(() => {
    if (location.hash === '#add-product') {
      window.setTimeout(() => {
        const section = document.getElementById('add-product-section')
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        productNameRef.current?.focus()
      }, 0)
    }
  }, [location.hash])

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Inventory foundations</h2>
        <p className="text-slate-600">
          Create product categories, add catalog items, and keep your stocking workflows moving without leaving the intake
          screen.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,_360px)_1fr]">
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Categories</h3>
            <p className="text-sm text-slate-600">
              Organize products as you discover new items during stock intake.
            </p>
          </div>

          {categoriesError ? <Alert variant="danger">{categoriesError}</Alert> : null}

          {categoryFormError ? <Alert variant="warning">{categoryFormError}</Alert> : null}

          {createCategoryError ? <Alert variant="danger">{createCategoryError}</Alert> : null}

          {categorySuccessMessage ? <Alert variant="success">{categorySuccessMessage}</Alert> : null}

          <Form onSubmit={handleCategorySubmit} className="space-y-3">
            <Form.Group controlId="categoryName">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Beverages"
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((previous) => ({ ...previous, name: event.target.value }))
                }
                disabled={isCreatingCategory}
                required
              />
            </Form.Group>
            <Form.Group controlId="categoryDescription">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Optional details to help buyers"
                value={categoryForm.description}
                onChange={(event) =>
                  setCategoryForm((previous) => ({ ...previous, description: event.target.value }))
                }
                disabled={isCreatingCategory}
              />
            </Form.Group>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={isCreatingCategory}>
                {isCreatingCategory ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden />
                    Saving…
                  </span>
                ) : (
                  'Add category'
                )}
              </Button>
            </div>
          </Form>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recently added</h4>
            {isLoadingCategories ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Spinner animation="border" size="sm" role="status" aria-hidden />
                Loading categories…
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-slate-500">No categories yet. Create one to get started.</p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-auto pr-1 text-sm text-slate-700">
                {categories.map((category) => (
                  <li key={category.id} className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="font-medium text-slate-900">{category.name}</p>
                    {category.description ? (
                      <p className="text-xs text-slate-600">{category.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section
          id="add-product-section"
          className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Products</h3>
              <p className="text-sm text-slate-600">
                Capture catalog metadata now—set landed costs and supplier info when receiving stock.
              </p>
            </div>
            {isLoadingProducts ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Spinner animation="border" size="sm" role="status" aria-hidden />
                Loading products…
              </div>
            ) : (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleRefreshProducts}
                disabled={isLoadingProducts}
              >
                Refresh list
              </Button>
            )}
          </div>

          {productsError ? <Alert variant="danger">{productsError}</Alert> : null}
          {productFormError ? <Alert variant="warning">{productFormError}</Alert> : null}
          {createProductError ? <Alert variant="danger">{createProductError}</Alert> : null}

          {productSuccessMessage ? <Alert variant="success">{productSuccessMessage}</Alert> : null}

          <Form onSubmit={handleProductSubmit} className="grid gap-4 md:grid-cols-2">
            <Form.Group controlId="productName" className="md:col-span-1">
              <Form.Label>Name</Form.Label>
              <Form.Control
                ref={productNameRef}
                type="text"
                placeholder="Product name"
                value={productForm.name}
                onChange={(event) =>
                  setProductForm((previous) => ({ ...previous, name: event.target.value }))
                }
                disabled={isCreatingProduct}
                required
              />
            </Form.Group>
            <Form.Group controlId="productSku" className="md:col-span-1">
              <Form.Label>SKU</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. SKU-12345"
                value={productForm.sku}
                onChange={(event) =>
                  setProductForm((previous) => ({ ...previous, sku: event.target.value }))
                }
                disabled={isCreatingProduct}
                required
              />
            </Form.Group>
            <Form.Group controlId="productCategory" className="md:col-span-1">
              <Form.Label>Category</Form.Label>
              <Form.Select
                value={productForm.category}
                onChange={(event) =>
                  setProductForm((previous) => ({ ...previous, category: event.target.value }))
                }
                disabled={isCreatingProduct || categories.length === 0}
                required
              >
                <option value="" disabled>
                  {categories.length === 0 ? 'Create a category first' : 'Select category'}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group controlId="productUnit" className="md:col-span-1">
              <Form.Label>Unit</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. each, bottle, kg"
                value={productForm.unit}
                onChange={(event) =>
                  setProductForm((previous) => ({ ...previous, unit: event.target.value }))
                }
                disabled={isCreatingProduct}
                required
              />
              <Form.Text muted>
                Prices now live on stock receipts. Keep this unit descriptive for future landed cost calculations.
              </Form.Text>
            </Form.Group>
            <Form.Group controlId="productDescription" className="md:col-span-2">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Optional notes for buyers or stock handlers"
                value={productForm.description}
                onChange={(event) =>
                  setProductForm((previous) => ({ ...previous, description: event.target.value }))
                }
                disabled={isCreatingProduct}
              />
            </Form.Group>
            <Form.Group controlId="productActive" className="md:col-span-2">
              <Form.Check
                type="switch"
                label="Product is active and available for stocking"
                checked={productForm.is_active}
                onChange={(event) =>
                  setProductForm((previous) => ({ ...previous, is_active: event.target.checked }))
                }
                disabled={isCreatingProduct}
              />
            </Form.Group>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={isCreatingProduct || categories.length === 0}>
                {isCreatingProduct ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden />
                    Saving…
                  </span>
                ) : (
                  'Add product'
                )}
              </Button>
            </div>
          </Form>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Catalog preview</h4>
            {isLoadingProducts && totalProducts === 0 ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Spinner animation="border" size="sm" role="status" aria-hidden />
                Loading products…
              </div>
            ) : totalProducts === 0 ? (
              <p className="text-sm text-slate-500">
                No products yet. Add one above to make stocking faster next time.
              </p>
            ) : (
              <>
                <div className="max-h-80 overflow-auto">
                  <Table responsive size="sm" hover>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>SKU</th>
                        <th>Category</th>
                        <th>Unit</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-3 text-center text-sm text-slate-500">
                            No products on this page. Try a different page or refresh.
                          </td>
                        </tr>
                      ) : (
                        products.map((product) => (
                          <tr key={product.id}>
                            <td>{product.name}</td>
                            <td>{product.sku}</td>
                            <td>{product.category_name ?? categories.find((category) => category.id === product.category)?.name ?? '—'}</td>
                            <td>{product.unit}</td>
                            <td>{product.is_active ? 'Active' : 'Archived'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                  <div>
                    Showing {showingFrom.toLocaleString()}–{showingTo.toLocaleString()} of {totalProducts.toLocaleString()} products
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Form.Select
                      size="sm"
                      className="w-auto"
                      value={productsPageSize.toString()}
                      onChange={handlePageSizeChange}
                      disabled={isLoadingProducts}
                      aria-label="Select products per page"
                    >
                      {[10, 25, 50, 100].map((option) => (
                        <option key={option} value={option}>
                          {option} per page
                        </option>
                      ))}
                    </Form.Select>
                    <div className="inline-flex items-center gap-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={isLoadingProducts || productsPage <= 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-slate-600">
                        Page {Math.min(productsPage, totalPages)} of {totalPages}
                      </span>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={
                          isLoadingProducts || productsPage >= totalPages || totalProducts === 0
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default InventoryPage
