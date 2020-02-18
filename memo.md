
[WebUSBことはじめ - Qiita](https://qiita.com/Aruneko/items/aebb75feca5bed12fe32)

VendorIDとProductIDの特定方法は、Linuxの場合lsusbコマンドを、macOSの場合system_profiler SPUSBDataTypeコマンドを利用する。


```js
const vendor_id = 0x054c
const product_id = 0x06c1
const device = await navigator.usb.requestDevice(
  {
    'filters': [
      {'vendorId': vendor_id, 'product_id': product_id}
    ]
  }
)

device.configurations

await device.open()
await device.selectConfiguration(1)
await device.claimInterface(0)
```
