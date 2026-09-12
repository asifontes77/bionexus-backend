import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizedPaymentFoundation1789257600000 implements MigrationInterface {
  name = 'NormalizedPaymentFoundation1789257600000';

  async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`CREATE TABLE currencies (
        id int NOT NULL AUTO_INCREMENT,
        code char(3) NOT NULL,
        name varchar(80) NOT NULL,
        symbol varchar(12) NOT NULL,
        symbol_position varchar(8) NOT NULL DEFAULT 'before',
        decimal_places tinyint unsigned NOT NULL DEFAULT 2,
        is_local tinyint NOT NULL DEFAULT 0,
        is_base tinyint NOT NULL DEFAULT 0,
        is_active tinyint NOT NULL DEFAULT 1,
        display_order int NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_currencies_code (code),
        CONSTRAINT CK_currencies_symbol_position CHECK (symbol_position IN ('before','after')),
        CONSTRAINT CK_currencies_decimal_places CHECK (decimal_places <= 4)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);
      await queryRunner.query(`INSERT INTO currencies(code,name,symbol,symbol_position,decimal_places,is_local,is_base,is_active,display_order) VALUES
        ('VES','Bolivar venezolano','Bs.','before',2,1,0,1,10),
        ('USD','Dolar estadounidense','USD','before',2,0,1,1,20)`);

      await queryRunner.query(`CREATE TABLE banks (
        id int NOT NULL AUTO_INCREMENT,
        code varchar(30) NOT NULL,
        name varchar(120) NOT NULL,
        short_name varchar(60) NULL,
        is_active tinyint NOT NULL DEFAULT 1,
        display_order int NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_banks_code (code),
        UNIQUE KEY UQ_banks_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

      await queryRunner.query(`CREATE TABLE payment_method_currencies (
        payment_method_id int NOT NULL,
        currency_id int NOT NULL,
        is_default tinyint NOT NULL DEFAULT 0,
        is_active tinyint NOT NULL DEFAULT 1,
        display_order int NOT NULL DEFAULT 0,
        PRIMARY KEY (payment_method_id,currency_id),
        KEY IX_payment_method_currencies_currency (currency_id),
        CONSTRAINT FK_payment_method_currencies_method FOREIGN KEY (payment_method_id) REFERENCES type_payment(id) ON DELETE CASCADE ON UPDATE RESTRICT,
        CONSTRAINT FK_payment_method_currencies_currency FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

      await queryRunner.query(`CREATE TABLE payment_method_fields (
        id int NOT NULL AUTO_INCREMENT,
        payment_method_id int NOT NULL,
        code varchar(50) NOT NULL,
        label varchar(100) NOT NULL,
        field_type varchar(30) NOT NULL,
        is_required tinyint NOT NULL DEFAULT 0,
        display_order int NOT NULL DEFAULT 0,
        min_length int NULL,
        max_length int NULL,
        input_mask varchar(100) NULL,
        validation_pattern varchar(255) NULL,
        help_text varchar(255) NULL,
        catalog_source varchar(30) NULL,
        is_active tinyint NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_payment_method_fields_code (payment_method_id,code),
        KEY IX_payment_method_fields_order (payment_method_id,display_order),
        CONSTRAINT FK_payment_method_fields_method FOREIGN KEY (payment_method_id) REFERENCES type_payment(id) ON DELETE CASCADE ON UPDATE RESTRICT,
        CONSTRAINT CK_payment_method_fields_type CHECK (field_type IN ('text','number','date','phone','reference','select','bank','boolean')),
        CONSTRAINT CK_payment_method_fields_lengths CHECK ((min_length IS NULL OR min_length >= 0) AND (max_length IS NULL OR max_length >= min_length))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

      await queryRunner.query(`ALTER TABLE way_pay_items
        ADD currency_id int NULL AFTER id_type_payment,
        ADD entered_amount decimal(18,2) NULL AFTER currency_id,
        ADD base_amount decimal(18,2) NULL AFTER entered_amount,
        ADD local_equivalent_amount decimal(18,2) NULL AFTER base_amount,
        ADD exchange_rate decimal(18,6) NULL AFTER base_amount,
        ADD exchange_rate_decimal_places tinyint unsigned NULL AFTER exchange_rate,
        ADD exchange_rate_date datetime NULL AFTER exchange_rate`);

      await queryRunner.query(`UPDATE way_pay_items SET
        currency_id=(SELECT id FROM currencies WHERE code=CASE WHEN id_type_payment=2 THEN 'USD' ELSE 'VES' END),
        entered_amount=CASE WHEN id_type_payment=2 THEN amountDollar ELSE amount END,
        base_amount=amountDollar,
        local_equivalent_amount=amount,
        exchange_rate=CAST(NULLIF(TRIM(dollar_value),'') AS DECIMAL(18,6)),
        exchange_rate_decimal_places=CASE WHEN dollar_value IS NULL OR TRIM(dollar_value)='' THEN NULL WHEN INSTR(TRIM(dollar_value),'.')=0 THEN 0 ELSE CHAR_LENGTH(SUBSTRING_INDEX(TRIM(dollar_value),'.',-1)) END,
        exchange_rate_date=CASE WHEN dollar_date REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN STR_TO_DATE(LEFT(dollar_date,10),'%Y-%m-%d') ELSE NULL END`);

      await queryRunner.query(`INSERT INTO payment_method_currencies(payment_method_id,currency_id,is_default,is_active,display_order)
        SELECT tp.id,c.id,CASE WHEN (tp.id=2 AND c.code='USD') OR (tp.id<>2 AND c.code='VES') THEN 1 ELSE 0 END,1,
        CASE c.code WHEN 'VES' THEN 10 ELSE 20 END
        FROM type_payment tp JOIN currencies c ON c.code IN ('VES','USD')`);

      await queryRunner.query(`INSERT INTO payment_method_fields(payment_method_id,code,label,field_type,is_required,display_order,max_length,catalog_source)
        SELECT id,'reference_number',description_1,'reference',1,10,50,NULL FROM type_payment WHERE TRIM(COALESCE(description_1,''))<>''`);
      await queryRunner.query(`INSERT INTO payment_method_fields(payment_method_id,code,label,field_type,is_required,display_order,max_length,catalog_source)
        SELECT id,CASE WHEN LOWER(TRIM(description_2))='banco' THEN 'bank' ELSE 'terminal' END,description_2,
        CASE WHEN LOWER(TRIM(description_2))='banco' THEN 'bank' ELSE 'text' END,1,20,50,
        CASE WHEN LOWER(TRIM(description_2))='banco' THEN 'banks' ELSE NULL END
        FROM type_payment WHERE TRIM(COALESCE(description_2,''))<>''`);

      await queryRunner.query(`CREATE TABLE payment_item_field_values (
        id bigint NOT NULL AUTO_INCREMENT,
        payment_item_id int NOT NULL,
        field_id int NULL,
        field_code varchar(50) NOT NULL,
        field_label varchar(100) NOT NULL,
        field_type varchar(30) NOT NULL,
        value_text varchar(500) NULL,
        bank_id int NULL,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_payment_item_field_value (payment_item_id,field_code),
        KEY IX_payment_item_field_values_field (field_id),
        KEY IX_payment_item_field_values_bank (bank_id),
        CONSTRAINT FK_payment_item_field_values_item FOREIGN KEY (payment_item_id) REFERENCES way_pay_items(id) ON DELETE CASCADE ON UPDATE RESTRICT,
        CONSTRAINT FK_payment_item_field_values_field FOREIGN KEY (field_id) REFERENCES payment_method_fields(id) ON DELETE SET NULL ON UPDATE RESTRICT,
        CONSTRAINT FK_payment_item_field_values_bank FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

      await queryRunner.query(`INSERT INTO payment_item_field_values(payment_item_id,field_id,field_code,field_label,field_type,value_text)
        SELECT wpi.id,pmf.id,pmf.code,pmf.label,pmf.field_type,wpi.description_1
        FROM way_pay_items wpi JOIN payment_method_fields pmf ON pmf.payment_method_id=wpi.id_type_payment AND pmf.display_order=10
        WHERE TRIM(COALESCE(wpi.description_1,''))<>''`);
      await queryRunner.query(`INSERT INTO payment_item_field_values(payment_item_id,field_id,field_code,field_label,field_type,value_text)
        SELECT wpi.id,pmf.id,pmf.code,pmf.label,pmf.field_type,wpi.description_2
        FROM way_pay_items wpi JOIN payment_method_fields pmf ON pmf.payment_method_id=wpi.id_type_payment AND pmf.display_order=20
        WHERE TRIM(COALESCE(wpi.description_2,''))<>''`);

      await queryRunner.query(`INSERT INTO payment_item_field_values(payment_item_id,field_id,field_code,field_label,field_type,value_text)
        SELECT wpi.id,NULL,'legacy_aux_1','Dato historico 1','text',wpi.description_1 FROM way_pay_items wpi
        WHERE TRIM(COALESCE(wpi.description_1,''))<>'' AND NOT EXISTS (SELECT 1 FROM payment_item_field_values v WHERE v.payment_item_id=wpi.id AND v.field_code='reference_number')`);
      await queryRunner.query(`INSERT INTO payment_item_field_values(payment_item_id,field_id,field_code,field_label,field_type,value_text)
        SELECT wpi.id,NULL,'legacy_aux_2','Dato historico 2','text',wpi.description_2 FROM way_pay_items wpi
        WHERE TRIM(COALESCE(wpi.description_2,''))<>'' AND NOT EXISTS (SELECT 1 FROM payment_item_field_values v WHERE v.payment_item_id=wpi.id AND v.field_code IN ('bank','terminal'))`);

      await queryRunner.query(`UPDATE way_pay_items SET id_type_payment=1 WHERE id_type_payment=2`);
      await queryRunner.query(`DELETE FROM payment_method_currencies WHERE payment_method_id=2`);
      await queryRunner.query(`DELETE FROM type_payment WHERE id=2`);

      await queryRunner.query(`ALTER TABLE way_pay_items
        MODIFY currency_id int NOT NULL,
        MODIFY entered_amount decimal(18,2) NOT NULL,
        MODIFY base_amount decimal(18,2) NOT NULL,
        MODIFY local_equivalent_amount decimal(18,2) NOT NULL,
        ADD KEY IX_way_pay_items_type_payment (id_type_payment),
        ADD KEY IX_way_pay_items_currency (currency_id),
        ADD CONSTRAINT FK_way_pay_items_type_payment FOREIGN KEY (id_type_payment) REFERENCES type_payment(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
        ADD CONSTRAINT FK_way_pay_items_currency FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
        DROP COLUMN description_1,
        DROP COLUMN description_2,
        DROP COLUMN amount,
        DROP COLUMN dollar,
        DROP COLUMN dollar_value,
        DROP COLUMN dollar_date,
        DROP COLUMN amountDollar`);

      await queryRunner.query(`ALTER TABLE type_payment
        MODIFY description varchar(100) NOT NULL,
        ADD code varchar(50) NULL AFTER id,
        ADD display_order int NOT NULL DEFAULT 0 AFTER description,
        DROP COLUMN description_1,
        DROP COLUMN description_2,
        DROP COLUMN only_dollars`);
      await queryRunner.query(`UPDATE type_payment SET code=CASE id WHEN 1 THEN 'cash' WHEN 3 THEN 'debit-card' WHEN 4 THEN 'mobile-payment' WHEN 5 THEN 'credit-card' ELSE CONCAT('payment-',id) END,display_order=id*10`);
      await queryRunner.query(`ALTER TABLE type_payment MODIFY code varchar(50) NOT NULL,ADD UNIQUE KEY UQ_type_payment_code(code),ADD UNIQUE KEY UQ_type_payment_description(description)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`ALTER TABLE type_payment DROP INDEX UQ_type_payment_description,DROP INDEX UQ_type_payment_code,ADD description_1 varchar(50) NULL,ADD description_2 varchar(50) NULL,ADD only_dollars tinyint NULL DEFAULT 0,DROP COLUMN display_order,DROP COLUMN code`);
      await queryRunner.query(`ALTER TABLE way_pay_items DROP FOREIGN KEY FK_way_pay_items_currency,DROP FOREIGN KEY FK_way_pay_items_type_payment,DROP INDEX IX_way_pay_items_currency,DROP INDEX IX_way_pay_items_type_payment,ADD description_1 varchar(50) NOT NULL DEFAULT '',ADD description_2 varchar(50) NOT NULL DEFAULT '',ADD amount decimal(18,2) NOT NULL DEFAULT 0,ADD dollar tinyint NOT NULL DEFAULT 0,ADD dollar_value varchar(20) NULL,ADD dollar_date varchar(20) NULL,ADD amountDollar decimal(18,2) NOT NULL DEFAULT 0`);
      await queryRunner.query(`UPDATE way_pay_items SET amount=local_equivalent_amount,amountDollar=base_amount,dollar=0,dollar_value=CASE WHEN exchange_rate IS NULL THEN NULL WHEN exchange_rate_decimal_places=0 THEN CAST(TRUNCATE(exchange_rate,0) AS CHAR) ELSE REPLACE(FORMAT(exchange_rate,exchange_rate_decimal_places,'en_US'),',','') END,dollar_date=DATE_FORMAT(exchange_rate_date,'%Y-%m-%d')`);
      await queryRunner.query(`UPDATE way_pay_items wpi
        LEFT JOIN payment_item_field_values v1 ON v1.payment_item_id=wpi.id AND v1.field_code IN ('reference_number','legacy_aux_1')
        LEFT JOIN payment_item_field_values v2 ON v2.payment_item_id=wpi.id AND v2.field_code IN ('bank','terminal','legacy_aux_2')
        SET wpi.description_1=COALESCE(v1.value_text,''),wpi.description_2=COALESCE(v2.value_text,'')`);
      await queryRunner.query(`SET @restore_legacy_payment_catalog = (SELECT COUNT(*) > 0 FROM type_payment)`);
      await queryRunner.query(`DELETE FROM type_payment`);
      await queryRunner.query(`INSERT INTO type_payment(id,description,description_1,description_2,annulled,only_dollars)
        SELECT 1,CONVERT(UNHEX('456665637469766F') USING utf8mb4),'','',0,0 WHERE @restore_legacy_payment_catalog=1
        UNION ALL SELECT 2,CONVERT(UNHEX('456665637469766F2D64E2949CE294826C61726573') USING utf8mb4),CONVERT(UNHEX('20') USING utf8mb4),CONVERT(UNHEX('20') USING utf8mb4),0,0 WHERE @restore_legacy_payment_catalog=1
        UNION ALL SELECT 3,CONVERT(UNHEX('542E2064E2949CC2AE6269746F') USING utf8mb4),CONVERT(UNHEX('4EE2949CE295916D65726F') USING utf8mb4),CONVERT(UNHEX('5465726D696E616C') USING utf8mb4),0,0 WHERE @restore_legacy_payment_catalog=1
        UNION ALL SELECT 4,CONVERT(UNHEX('5061676F204DE2949CE2948276696C') USING utf8mb4),CONVERT(UNHEX('4EE2949CE295916D65726F') USING utf8mb4),CONVERT(UNHEX('42616E636F') USING utf8mb4),0,0 WHERE @restore_legacy_payment_catalog=1
        UNION ALL SELECT 5,CONVERT(UNHEX('542E206372E2949CC2AE6469746F') USING utf8mb4),CONVERT(UNHEX('4EE2949CE295916D65726F') USING utf8mb4),CONVERT(UNHEX('5465726D696E616C') USING utf8mb4),0,0 WHERE @restore_legacy_payment_catalog=1`);
      await queryRunner.query(`UPDATE way_pay_items SET id_type_payment=2 WHERE id_type_payment=1 AND (SELECT code FROM currencies WHERE id=currency_id)='USD'`);
      await queryRunner.query(`ALTER TABLE type_payment MODIFY description varchar(50) NULL`);
      await queryRunner.query(`ALTER TABLE type_payment AUTO_INCREMENT=6`);
      await queryRunner.query(`ALTER TABLE way_pay_items DROP COLUMN exchange_rate_date,DROP COLUMN exchange_rate_decimal_places,DROP COLUMN exchange_rate,DROP COLUMN local_equivalent_amount,DROP COLUMN base_amount,DROP COLUMN entered_amount,DROP COLUMN currency_id`);
      await queryRunner.query(`DROP TABLE payment_item_field_values`);
      await queryRunner.query(`DROP TABLE payment_method_fields`);
      await queryRunner.query(`DROP TABLE payment_method_currencies`);
      await queryRunner.query(`DROP TABLE banks`);
      await queryRunner.query(`DROP TABLE currencies`);
  }
}









