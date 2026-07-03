import { useLanguage } from '../context/LanguageContext';
import './Disclaimer.css';

function Disclaimer() {
  const { lang } = useLanguage();
  const isZh = lang !== 'en';

  return (
    <div className="disclaimer-page">
      <div className="disclaimer-card">
        <h1 className="disclaimer-title">{isZh ? '免责声明' : 'Disclaimer'}</h1>

        {isZh ? (
          <div className="disclaimer-body">
            <p>
              Dorm 是由学生自主开发的校园信息与点评平台，旨在为同学提供便利的信息参考。
            </p>
            <p>
              平台内所有商家信息（包括但不限于菜单、价格、图片等）主要来源于用户整理或公开渠道，仅供参考，不代表商家官方信息。
            </p>
            <p>
              平台不隶属于学校或任何官方机构，亦不代表任何商家立场。
            </p>
            <p>
              如相关商家或个人认为平台内容存在错误、侵权或不当之处，请联系我们，我们将及时核实并处理或删除相关内容。
            </p>
            <p>
              Dorm 致力于构建真实、透明的校园信息交流环境。
            </p>
          </div>
        ) : (
          <div className="disclaimer-body">
            <p>
              Dorm is a student-developed campus information and review platform designed to provide convenient reference for students.
            </p>
            <p>
              All merchant information (including but not limited to menus, prices, and images) is collected from user contributions or publicly available sources and is for reference only. It does not represent official information of any merchant.
            </p>
            <p>
              Dorm is not affiliated with the university or any official institution, nor does it represent any merchant.
            </p>
            <p>
              If any merchant or individual believes that content on the platform is inaccurate, infringing, or inappropriate, please contact us. We will promptly verify and update or remove the content.
            </p>
            <p>
              Dorm is committed to building a transparent and authentic campus information-sharing environment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Disclaimer;

