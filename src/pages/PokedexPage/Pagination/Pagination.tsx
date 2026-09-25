import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const { t } = useI18n()

  return (
    <nav aria-label={t('pokedex.pagination.label')} className="mt-6 flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        {t('pokedex.pagination.previous')}
      </Button>
      <span aria-live="polite" className="text-muted-foreground text-sm">
        {t('pokedex.pagination.status', { page, pages: totalPages })}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {t('pokedex.pagination.next')}
      </Button>
    </nav>
  )
}
