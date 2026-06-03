# paginator

Page state plus an indicator, for paging through a long collection. Holds the
current page and page size, handles the paging keys, and offers `sliceBounds()`
so you can carve the visible page out of your items.

[← all components](../README.md#components)

## Usage

```js
const { paginator } = require('bare-tea')

const p = paginator.create({ perPage: 10, total: items.length, type: 'dots' })

// in update: const [m] = p.update(msg); this.pager = m
// in view:
const [start, end] = p.sliceBounds()
render(items.slice(start, end))
p.view() // "●○○○○"  (dots)  or  "1/5"  (arabic)
```

## Options

| Option                      | Default       | Description                            |
| --------------------------- | ------------- | -------------------------------------- |
| `perPage`                   | `10`          | Items per page                         |
| `total`                     | `0`           | Total item count                       |
| `page`                      | `0`           | Initial page (zero-indexed)            |
| `type`                      | `'arabic'`    | `'arabic'` (`1/5`) or `'dots'` (`●○○`) |
| `activeDot` / `inactiveDot` | `'●'` / `'○'` | Dot characters                         |

## API

- `sliceBounds(length?)` → `[start, end)` for the current page.
- `itemsOnPage(length?)` — count on the current page.
- `nextPage()` / `prevPage()` / `setPage(n)` / `setTotal(n)`.
- `.page` / `.totalPages` / `onFirstPage()` / `onLastPage()`.

## Keys

`←`/`→` (`h`/`l`, `pgup`/`pgdn`) change pages. Bindings are exported as
`paginator.keys` for the [help](help.md) component.
