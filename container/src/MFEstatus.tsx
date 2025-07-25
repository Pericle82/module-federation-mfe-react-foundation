
type MfeKey = 'store_mfe' | 'service_mfe' | 'mfe_1' | 'mfe_2';


interface MFEstatusProps {
  mfeList: { key: MfeKey; label: string; status: 'loading' | 'ready' }[];
}

const MFEstatus: React.FC<MFEstatusProps> = ({
  mfeList
}) => {

  return (
    <section className="mfe-status-section" style={{ marginBottom: 24 }}>
      <h2>Microfrontend Load Status</h2>
      <ul>
        {mfeList.map(mfe => (
          <li key={mfe.key}>
            <strong>{mfe.label}</strong>: {mfe.status}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default MFEstatus;