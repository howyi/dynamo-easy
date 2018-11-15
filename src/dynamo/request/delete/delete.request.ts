import {
  DeleteItemInput,
  DeleteItemOutput,
  ReturnConsumedCapacity,
  ReturnItemCollectionMetrics,
} from 'aws-sdk/clients/dynamodb'
import { Observable } from 'rxjs'
import { map, tap } from 'rxjs/operators'
import { createLogger, Logger } from '../../../logger/logger'
import { Mapper } from '../../../mapper/mapper'
import { Attributes } from '../../../mapper/type/attribute.type'
import { ModelConstructor } from '../../../model/model-constructor'
import { DynamoRx } from '../../dynamo-rx'
import { and } from '../../expression/logical-operator/and.function'
import { ParamUtil } from '../../expression/param-util'
import { RequestExpressionBuilder } from '../../expression/request-expression-builder'
import { ConditionExpressionDefinitionFunction } from '../../expression/type/condition-expression-definition-function'
import { RequestConditionFunction } from '../../expression/type/request-condition-function'
import { BaseRequest } from '../base.request'

export class DeleteRequest<T> extends BaseRequest<T, DeleteItemInput> {
  private readonly logger: Logger

  constructor(
    dynamoRx: DynamoRx,
    modelClazz: ModelConstructor<T>,
    tableName: string,
    partitionKey: any,
    sortKey?: any
  ) {
    super(dynamoRx, modelClazz, tableName)
    this.logger = createLogger('dynamo.request.DeleteRequest', modelClazz)

    const hasSortKey: boolean = this.metaData.getSortKey() !== null

    if (hasSortKey && (sortKey === null || sortKey === undefined)) {
      throw new Error(`please provide the sort key for attribute ${this.metaData.getSortKey()}`)
    }

    const keyAttributeMap: Attributes = {}

    // partition key
    const partitionKeyValue = Mapper.toDbOne(partitionKey, this.metaData.forProperty(this.metaData.getPartitionKey()))

    if (partitionKeyValue === null) {
      throw new Error('please provide an acutal value for partition key, got null')
    }

    keyAttributeMap[<string>this.metaData.getPartitionKey()] = partitionKeyValue

    // sort key
    if (hasSortKey) {
      const sortKeyValue = Mapper.toDbOne(sortKey!, this.metaData.forProperty(this.metaData.getSortKey()!))

      if (sortKeyValue === null) {
        throw new Error('please provide an actual value for sort key, got null')
      }

      keyAttributeMap[<string>this.metaData.getSortKey()!] = sortKeyValue
    }

    this.params.Key = keyAttributeMap
  }

  whereAttribute(attributePath: keyof T): RequestConditionFunction<DeleteRequest<T>> {
    return RequestExpressionBuilder.addCondition('ConditionExpression', <string>attributePath, this, this.metaData)
  }

  where(...conditionDefFns: ConditionExpressionDefinitionFunction[]): DeleteRequest<T> {
    const condition = and(...conditionDefFns)(undefined, this.metaData)
    ParamUtil.addExpression('ConditionExpression', condition, this.params)
    return this
  }

  returnConsumedCapacity(level: ReturnConsumedCapacity): DeleteRequest<T> {
    this.params.ReturnConsumedCapacity = level
    return this
  }

  returnItemCollectionMetrics(returnItemCollectionMetrics: ReturnItemCollectionMetrics): DeleteRequest<T> {
    this.params.ReturnItemCollectionMetrics = returnItemCollectionMetrics
    return this
  }

  /*
   * The ReturnValues parameter is used by several DynamoDB operations; however,
   * DeleteItem does not recognize any values other than NONE or ALL_OLD.
   */
  returnValues(returnValues: 'NONE' | 'ALL_OLD'): DeleteRequest<T> {
    this.params.ReturnValues = returnValues
    return this
  }

  execFullResponse(): Observable<DeleteItemOutput> {
    this.logger.debug('request', this.params)
    return this.dynamoRx.deleteItem(this.params).pipe(tap(response => this.logger.debug('response', response)))
  }

  exec(): Observable<void> {
    return this.execFullResponse().pipe(
      map(response => {
        return
      })
    )
  }
}
