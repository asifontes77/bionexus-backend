export class CreateTaxDto {
  description: string;
  value: number;
  only_dollars?: boolean;
  always_subtotal?: boolean;
  hide?: boolean;
}