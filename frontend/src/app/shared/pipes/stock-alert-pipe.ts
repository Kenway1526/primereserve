import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'stockAlert',
})
export class StockAlertPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
