import { DynamoEasy } from '../../../dynamo-easy'
import { Util } from '../../../mapper/util'
import { TypeInfo } from '../../metadata/property-metadata.model'
import { initOrUpdateProperty } from '../property/property.decorator'
import { MomentType } from './moment.type'

export function Date(): PropertyDecorator {
  return (target: any, propertyKey: string) => {
    // check the global config to decide which dat type we should use
    let dateType
    switch (DynamoEasy.config.dateType) {
      case 'default':
        dateType = Date
        break
      case 'moment':
        dateType = MomentType
        break
    }

    const typeInfo: Partial<TypeInfo> = <Partial<TypeInfo>>{
      type: dateType,
      isCustom: true,
    }

    initOrUpdateProperty({ typeInfo }, target, propertyKey)
  }
}
