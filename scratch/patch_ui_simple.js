const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', '(dashboard)', 'dashboard', 'devices', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state
const stateMarker = 'const [selectedIds, setSelectedIds] = useState<number[]>([]);';
const stateCode = `
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFormData, setTransferFormData] = useState({ targetDepartmentId: 0, targetLocationId: 0, notes: '' });
  const [transferHistory, setTransferHistory] = useState<any[]>([]);
`;
content = content.replace(stateMarker, stateMarker + '\n' + stateCode);

// 2. Add handlers
const handlerMarker = 'const handleDelete = async () => {';
const handlerCode = `
  const handleTransfer = () => {
    if (selectedIds.length !== 1) {
      toast.warning('Vui lòng chọn 1 thiết bị để luân chuyển');
      return;
    }
    const device = devices.find((d) => d.id === selectedIds[0]);
    if (device) {
      setTransferFormData({ targetDepartmentId: device.departmentId, targetLocationId: device.locationId || 0, notes: '' });
      setShowTransferModal(true);
    }
  };

  const submitTransfer = async () => {
    try {
      const res = await api.post(\`/devices/\${selectedIds[0]}/transfer\`, transferFormData);
      if (res.data.status) {
        toast.success('Luân chuyển thành công');
        setShowTransferModal(false);
        loadData();
      } else {
        toast.error(res.data.error || 'Lỗi luân chuyển');
      }
    } catch (e: any) {
      toast.error('Lỗi khi luân chuyển thiết bị');
    }
  };

`;
content = content.replace(handlerMarker, handlerCode + handlerMarker);

// 3. Inject button in Action bar
const buttonCode = `
              <button 
                className="btn btn-warning btn-sm text-white" 
                onClick={handleTransfer}
                title="Luân chuyển vị trí"
              >
                <i className="fas fa-exchange-alt"></i>
              </button>`;
const regex = /<button\s+className="btn btn-success btn-sm"\s+onClick=\{handleEdit\}/;
content = content.replace(regex, buttonCode.trim() + '\n              <button className="btn btn-success btn-sm" onClick={handleEdit}');

// 4. Inject load history for transfers
const loadHistoryMarker = 'setHistoryData(data || null);';
const loadHistoryCode = `
        try {
          const transRes = await api.get(\`/devices/\${deviceId}/transfers\`);
          if (transRes.data?.status) {
            setTransferHistory(transRes.data.data);
          }
        } catch(e) {}
`;
content = content.replace(loadHistoryMarker, loadHistoryMarker + '\n' + loadHistoryCode);

// 5. Inject simple Transfer history list BEFORE the modal body closes
// Finding the modal-footer properly without destroying JSX
const footerMatch = /<\/div>\s*<\/div>\s*<div className="modal-footer d-flex justify-content-between align-items-center">/;

const appendHtml = `
                    <div className="mt-4 pt-3 border-top">
                      <h6 className="fw-bold mb-3"><i className="fas fa-exchange-alt me-2 text-warning"></i>Lịch sử luân chuyển thiết bị</h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead className="table-light">
                            <tr><th>Ngày chuyển</th><th>Người chuyển</th><th>Từ (Khoa/Phòng - Vị trí)</th><th>Đến (Khoa/Phòng - Vị trí)</th><th>Ghi chú</th></tr>
                          </thead>
                          <tbody>
                            {transferHistory.map((t: any) => (
                              <tr key={t.Id}>
                                <td>{formatDateTime(t.TransferDate)}</td>
                                <td>{t.TransferredByName}</td>
                                <td>{t.FromDepartmentName} - {t.FromLocationName}</td>
                                <td>{t.ToDepartmentName} - {t.ToLocationName}</td>
                                <td>{t.Notes}</td>
                              </tr>
                            ))}
                            {transferHistory.length === 0 && <tr><td colSpan={5} className="text-center">Chưa có lịch sử luân chuyển</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer d-flex justify-content-between align-items-center">
`;

// wait, the original has `)}` at the end of the conditional rendering.
// Let's replace the last `</div> </div> )}` inside modal-body.

content = content.replace(/(<\/div>\s*<\/div>\s*)\s*(<div className="modal-footer d-flex justify-content-between align-items-center">)/, `
  <div className="mt-4 pt-3 border-top">
    <h6 className="fw-bold mb-3"><i className="fas fa-exchange-alt me-2 text-warning"></i>Lịch sử luân chuyển thiết bị</h6>
    <div className="table-responsive">
      <table className="table table-sm table-bordered">
        <thead className="table-light">
          <tr><th>Ngày chuyển</th><th>Người chuyển</th><th>Từ</th><th>Đến</th><th>Ghi chú</th></tr>
        </thead>
        <tbody>
          {transferHistory.map((t: any) => (
            <tr key={t.Id}>
              <td>{formatDateTime(t.TransferDate)}</td>
              <td>{t.TransferredByName}</td>
              <td>{t.FromDepartmentName} - {t.FromLocationName}</td>
              <td>{t.ToDepartmentName} - {t.ToLocationName}</td>
              <td>{t.Notes}</td>
            </tr>
          ))}
          {transferHistory.length === 0 && <tr><td colSpan={5} className="text-center">Chưa có lịch sử luân chuyển</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
$1$2`);

// 6. Inject Transfer Modal
const finalModalMarker = '{/* File Manager Modal */}';
const transferModalHtml = `
      {showTransferModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Luân chuyển thiết bị</h5>
                <button type="button" className="btn-close" onClick={() => setShowTransferModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="form-group mb-3">
                  <label>Phòng ban mới</label>
                  <select className="form-control" value={transferFormData.targetDepartmentId} onChange={e => setTransferFormData({...transferFormData, targetDepartmentId: Number(e.target.value)})}>
                    <option value="0">-- Chọn phòng ban --</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group mb-3">
                  <label>Vị trí mới</label>
                  <SearchableSelect
                    className="form-control"
                    options={formattedLocations}
                    value={transferFormData.targetLocationId}
                    onChange={(val: number) => setTransferFormData({ ...transferFormData, targetLocationId: val })}
                    placeholder="-- Chọn vị trí --"
                  />
                </div>
                <div className="form-group mb-3">
                  <label>Ghi chú / Lý do chuyển</label>
                  <textarea className="form-control" rows={3} value={transferFormData.notes} onChange={e => setTransferFormData({...transferFormData, notes: e.target.value})}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>Hủy</button>
                <button type="button" className="btn btn-primary" onClick={submitTransfer}>Xác nhận luân chuyển</button>
              </div>
            </div>
          </div>
        </div>
      )}
`;
content = content.replace(finalModalMarker, transferModalHtml + '\n' + finalModalMarker);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Very Simple Patch complete.');
