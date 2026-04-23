import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyMxn',
})
export class CurrencyMxnPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
