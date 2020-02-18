
let startButton = document.getElementById('start');
let idmMessage = document.getElementById('idm');
let waitingMessage = document.getElementById('waiting');

async function sleep(msec) {
  return new Promise(resolve => setTimeout(resolve, msec));
}

async function send(device, data) {
  let uint8a = new Uint8Array(data);
  console.log(">>>>>>>>>> send");
  console.log(uint8a);
  await device.transferOut(2, uint8a);
  await sleep(10);
}

async function receive(device, len) {
  console.log("<<<<<<<<<< recv " + len);
  let data = await device.transferIn(1, len);
  console.log(data);
  await sleep(10);
  let arr = [];
  for (let i = data.data.byteOffset; i < data.data.byteLength; i++) {
    arr.push(data.data.getUint8(i));
  }
  console.log(arr);
  return arr;
}

function array_equal(a, b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function sum(array) {
  let total = 0;
  for (var i = 0; i < array.length; i++) {
    total += array[i];
  }
  return total;
}

function int_to_uint16(integer) {
  return Array.from(new Uint8Array((new Uint16Array([integer])).buffer));
}
function uint16_to_int(bytearray) {
  return (bytearray[1] << 8) + bytearray[0];
}
function mod(a, n) {
  return ((a % n) + n) % n;
}

ACK = [0x00, 0x00, 0xff, 0x00, 0xff, 0x00];

class Frame {
  // https://github.com/nfcpy/nfcpy/blob/master/src/nfc/clf/rcs380.py

  constructor(data) {
    this._data = null;
    this._type = null;
    this._frame = null;

    if (array_equal(data.slice(0, 3), [0x00, 0x00, 0xff])) {
      let frame = data;
      if (array_equal(frame, [0x00, 0x00, 0xff, 0x00, 0xff, 0x00])) {
        this._type = "ack";
      } else if (array_equal(frame, [0x00, 0x00, 0xff, 0xff, 0xff])) {
        this._type = "err";
      } else if (array_equal(frame.slice(3, 5), [0xff, 0xff])) {
        this._type = "data";
        let length = uint16_to_int(frame.slice(5, 7));
        this._data = frame.slice(8, 8 + length);
      }
    }
    else {
      let frame1 = [0x00, 0x00, 0xff, 0xff, 0xff];
      let frame2 = int_to_uint16(data.length);
      let frame3 = [mod(256 - sum(frame2), 256)];
      let frame4 = data;
      let frame5 = [mod(256 - sum(frame4), 256), 0];
      let frame = frame1.concat(frame2).concat(frame3)
                        .concat(frame4).concat(frame5);
      this._frame = frame;
    }
  }

  to_bytes() {
    return this._frame;
  }

  get_data() {
    return this._data;
  }
}

async function session(device) {
  let data;
  let frame, recv_frame;
  // INFO:nfc.clf:searching for reader on path usb:054c:06c3
  // DEBUG:nfc.clf.transport:using libusb-1.0.21
  // DEBUG:nfc.clf.transport:path matches '^usb(:[0-9a-fA-F]{4})(:[0-9a-fA-F]{4})?$'
  // DEBUG:nfc.clf.device:loading rcs380 driver for usb:054c:06c3
  // Level 9:nfc.clf.transport:>>> 0000ff00ff00
  /// await send(device, [0x00, 0x00, 0xff, 0x00, 0xff, 0x00]);
  await send(device, ACK);

  // Level 9:nfc.clf.rcs380:SetCommandType 01
  // Level 9:nfc.clf.transport:>>> 0000ffffff0300fdd62a01ff00
  frame = new Frame([0xd6, 0x2a, 0x01]);
  await send(device, frame.to_bytes());
  /// await send(device, [0x00, 0x00, 0xff, 0xff, 0xff, 0x03, 0x00, 0xfd, 0xd6, 0x2a, 0x01, 0xff, 0x00]);
  // Level 9:nfc.clf.transport:<<< 0000ff00ff00
  await receive(device, 6);
  // Level 9:nfc.clf.transport:<<< 0000ffffff0300fdd72b00fe00
  await receive(device, 13);

  // Level 9:nfc.clf.rcs380:GetFirmwareVersion
  // Level 9:nfc.clf.transport:>>> 0000ffffff0200fed6200a00
  // Level 9:nfc.clf.transport:<<< 0000ff00ff00
  // Level 9:nfc.clf.transport:<<< 0000ffffff0400fcd7211101f600
  // DEBUG:nfc.clf.rcs380:firmware version 1.11
  // Level 9:nfc.clf.rcs380:GetPDDataVersion
  // Level 9:nfc.clf.transport:>>> 0000ffffff0200fed6220800
  // Level 9:nfc.clf.transport:<<< 0000ff00ff00
  // Level 9:nfc.clf.transport:<<< 0000ffffff0400fcd72300010500
  // DEBUG:nfc.clf.rcs380:package data format 1.00

  // Level 9:nfc.clf.rcs380:SwitchRF 00
  // Level 9:nfc.clf.transport:>>> 0000ffffff0300fdd606002400
  frame = new Frame([0xd6, 0x06, 0x00]);
  await send(device, frame.to_bytes());
  /// await send(device, [0x00, 0x00, 0xff, 0xff, 0xff, 0x03, 0x00, 0xfd, 0xd6, 0x06, 0x00, 0x24, 0x00]);
  // Level 9:nfc.clf.transport:<<< 0000ff00ff00
  await receive(device, 6);
  // Level 9:nfc.clf.transport:<<< 0000ffffff0300fdd707002200
  await receive(device, 13);

  // Level 9:nfc.clf.rcs380:InSetRF 01010f01
  // Level 9:nfc.clf.transport:>>> 0000ffffff0600fad60001010f011800
  frame = new Frame([0xd6, 0x00, 0x01, 0x01, 0x0f, 0x01]);
  await send(device, frame.to_bytes());
  // Level 9:nfc.clf.transport:<<< 0000ff00ff00
  await receive(device, 6);
  // Level 9:nfc.clf.transport:<<< 0000ffffff0300fdd701002800
  await receive(device, 13);

  // Level 9:nfc.clf.rcs380:InSetProtocol 00180101020103000400050006000708080009000a000b000c000e040f001000110012001306
  // Level 9:nfc.clf.transport:>>> 0000ffffff2800d8d60200180101020103000400050006000708080009000a000b000c000e040f0010001100120013064b00
  frame = new Frame([0xd6, 0x02, 0x00, 0x18, 0x01, 0x01, 0x02, 0x01, 0x03, 0x00, 0x04, 0x00, 0x05, 0x00, 0x06, 0x00, 0x07, 0x08, 0x08, 0x00, 0x09, 0x00, 0x0a, 0x00, 0x0b, 0x00, 0x0c, 0x00, 0x0e, 0x04, 0x0f, 0x00, 0x10, 0x00, 0x11, 0x00, 0x12, 0x00, 0x13, 0x06]);
  await send(device, frame.to_bytes());
  // Level 9:nfc.clf.transport:<<< 0000ff00ff00
  await receive(device, 6);
  // Level 9:nfc.clf.transport:<<< 0000ffffff0300fdd703002600
  await receive(device, 13);

  // Level 9:nfc.clf.rcs380:InSetProtocol 0018
  // Level 9:nfc.clf.transport:>>> 0000ffffff0400fcd60200181000

  frame = new Frame([0xd6, 0x02, 0x00, 0x18]);
  await send(device, frame.to_bytes());
  // Level 9:nfc.clf.transport:<<< 0000ff00ff00
  await receive(device, 6);
  // Level 9:nfc.clf.transport:<<< 0000ffffff0300fdd703002600
  await receive(device, 13);
  // DEBUG:nfc.clf.rcs380:send SENSF_REQ 00ffff0100

  // Level 9:nfc.clf.rcs380:InCommRF 6e000600ffff0100
  // Level 9:nfc.clf.transport:>>> 0000ffffff0a00f6d6046e000600ffff0100b300
  frame = new Frame([0xd6, 0x04, 0x6e, 0x00, 0x06, 0x00, 0xff, 0xff, 0x01, 0x00]);
  await send(device, frame.to_bytes());
  // Level 9:nfc.clf.transport:<<< 0000ff00ff00
  await receive(device, 6);
  // Level 9:nfc.clf.transport:<<< 0000ffffff1b00e5d70500000000081401000000000000000000000000000000000000f700
  data = await receive(device, 37);
  recv_frame = new Frame(data);
  const idm_length = 7;
  // let idm = data.slice(17, 24);
  let idm = recv_frame.get_data().slice(9, 9 + idm_length);
  if (idm.length > 0) {
    let idmStr = '';
    for (let i = 0; i < idm.length; i++) {
      if (idm[i] < 16) {
        idmStr += '0';
      }
      idmStr += idm[i].toString(16);
    }
    idmMessage.innerText = "カードのIDm: " + idmStr;
    idmMessage.style.display = 'block';
    waitingMessage.style.display = 'none';
  } else {
    idmMessage.style.display = 'none';
    waitingMessage.style.display = 'block';
  }
  // DEBUG:nfc.clf.rcs380:rcvd SENSF_RES 01000000000000000000000000000000000000
  // DEBUG:nfc.clf:found 212F sensf_res=01000000000000000000000000000000000000
  // 212F sensf_res=01000000000000000000000000000000000000
  // DEBUG:nfc.tag:trying to activate 212F sensf_res=01000000000000000000000000000000000000
  // DEBUG:nfc.tag:trying type 3 tag activation for 212F
  // Type3Tag 'FeliCa Standard' ID=000000000000000 PMM=0000000000000000 SYS=0000
  // 0000000000000000
  // Level 9:nfc.clf.rcs380:SwitchRF 00
  // Level 9:nfc.clf.transport:>>> 0000ffffff0300fdd606002400
  // Level 9:nfc.clf.transport:<<< 0000ff00ff00
  // Level 9:nfc.clf.transport:<<< 0000ffffff0300fdd707002200
  // Level 9:nfc.clf.transport:>>> 0000ff00ff00
}

startButton.addEventListener('click', async () => {
  let device;
  try {
    device = await navigator.usb.requestDevice({ filters: [{
      vendorId:  0x054c, // Sony
      productId: 0x06C3  // RC-S380
    }]});
  } catch (e) {
    console.log(e);
    alert(e);
    throw e;
  }
  try {
    console.log("open");
    await device.open();
    console.log("selectConfiguration");
    await device.selectConfiguration(1);
    console.log("claimInterface");
    await device.claimInterface(0);
    console.log(device);
    startButton.style.display = 'none';
    waitingMessage.style.display = 'block';
    do {
      await session(device);
      await sleep(2000);
    } while (true);
  } catch (e) {
    console.log(e);
    alert(e);
    try {
      device.close();
    } catch (e) {
      console.log(e);
    }
    startButton.style.display = 'block';
    waitingMessage.style.display = 'none';
    idmMessage.style.display = 'none';
    throw e;
  }
});
