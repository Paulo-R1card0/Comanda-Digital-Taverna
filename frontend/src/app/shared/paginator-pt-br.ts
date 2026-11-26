import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

/** Textos do paginador do Angular Material em português. */
@Injectable()
export class PaginatorPtBr extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Itens por página';
  override nextPageLabel = 'Próxima página';
  override previousPageLabel = 'Página anterior';
  override firstPageLabel = 'Primeira página';
  override lastPageLabel = 'Última página';
  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0) return '0 de 0';
    const inicio = page * pageSize + 1;
    const fim = Math.min(length, (page + 1) * pageSize);
    return `${inicio} – ${fim} de ${length}`;
  };
}
