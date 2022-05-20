import { useNavigate } from 'solid-app-router';
import { Component } from 'solid-js';
import styles from './Logo.module.css';

interface Props {
  compact?: boolean;
}

const Logo: Component<Props> = (props) => {
  const navigate = useNavigate();
  const compactClass = () => props.compact ? styles['logo--compact'] : '';

  return (
    <a className={`${styles.logo} ${compactClass()}`} onClick={() => navigate('/')}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 375 115"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M81.7496 19.7277C84.9771 19.7277 87.7842 20.0936 90.1709 20.8252C92.5848 21.5297 94.4969 22.2884 95.9072 23.1013C97.3447 23.9142 98.2126 24.4426 98.5109 24.6865L93.5476 32.9374C93.1137 32.5852 92.3678 32.0974 91.3101 31.4742C90.2794 30.8239 89.0318 30.2548 87.5672 29.7671C86.1027 29.2523 84.516 28.9948 82.8073 28.9948C80.3392 28.9948 78.3593 29.469 76.8676 30.4174C75.403 31.3387 74.6708 32.68 74.6708 34.4413C74.6708 35.6336 75.064 36.7039 75.8506 37.6523C76.6371 38.5736 77.7898 39.4406 79.3086 40.2536C80.8546 41.0665 82.7395 41.92 84.9635 42.8142C86.9163 43.5729 88.7742 44.4536 90.5371 45.4561C92.3271 46.4587 93.9138 47.6374 95.297 48.9923C96.7073 50.3471 97.8193 51.9187 98.633 53.7071C99.4738 55.4955 99.8942 57.5413 99.8942 59.8445C99.8942 62.4187 99.3653 64.6677 98.3075 66.5916C97.2769 68.5155 95.8394 70.1277 93.9951 71.4284C92.178 72.729 90.0896 73.7045 87.73 74.3548C85.3704 75.0052 82.8887 75.3303 80.285 75.3303C76.7591 75.3303 73.5859 74.9239 70.7652 74.111C67.9716 73.271 65.7069 72.3768 63.9711 71.4284C62.2353 70.48 61.2183 69.8703 60.9199 69.5994L66.1273 61.0232C66.4528 61.2671 67.063 61.66 67.9581 62.2019C68.8802 62.7439 69.9922 63.2994 71.2941 63.8684C72.623 64.4374 74.0605 64.9252 75.6065 65.3316C77.1795 65.7381 78.7797 65.9413 80.407 65.9413C83.3362 65.9413 85.5467 65.3316 87.0384 64.1123C88.5301 62.8929 89.2759 61.3077 89.2759 59.3568C89.2759 57.8936 88.8013 56.6065 87.852 55.4955C86.9028 54.3845 85.5602 53.3684 83.8244 52.4471C82.1157 51.4987 80.068 50.5368 77.6813 49.5613C75.2946 48.5587 73.0706 47.3936 71.0093 46.0658C68.9751 44.711 67.3343 43.0581 66.0867 41.1071C64.839 39.129 64.2152 36.7039 64.2152 33.8316C64.2152 30.9865 65.0153 28.5071 66.6155 26.3936C68.2428 24.28 70.3855 22.6406 73.0434 21.4755C75.7285 20.3103 78.6306 19.7277 81.7496 19.7277Z"
          fill="white"
        />
        <path
          d="M114.772 91.2632H104.52V40.9852H114.894V46.391C115.22 45.6052 115.925 44.711 117.01 43.7084C118.094 42.7058 119.505 41.8387 121.241 41.1071C123.004 40.3755 125.011 40.0097 127.262 40.0097C130.435 40.0097 133.201 40.7819 135.561 42.3265C137.921 43.871 139.738 45.9845 141.013 48.6671C142.314 51.3226 142.965 54.3303 142.965 57.6903C142.965 61.0503 142.287 64.0716 140.931 66.7542C139.575 69.4097 137.69 71.5097 135.276 73.0542C132.862 74.5716 130.055 75.3303 126.855 75.3303C124.441 75.3303 122.366 74.8968 120.63 74.0297C118.895 73.1626 117.538 72.1871 116.562 71.1032C115.586 70.0194 114.989 69.1658 114.772 68.5426V91.2632ZM132.835 57.6903C132.835 55.8207 132.428 54.1813 131.615 52.7723C130.828 51.3361 129.77 50.2252 128.442 49.4394C127.113 48.6265 125.634 48.22 124.007 48.22C122.298 48.22 120.752 48.6265 119.369 49.4394C117.986 50.2523 116.888 51.3768 116.074 52.8129C115.287 54.2219 114.894 55.8477 114.894 57.6903C114.894 59.5329 115.287 61.1723 116.074 62.6084C116.888 64.0174 117.986 65.1284 119.369 65.9413C120.752 66.7271 122.298 67.12 124.007 67.12C125.634 67.12 127.113 66.7271 128.442 65.9413C129.77 65.1555 130.828 64.0581 131.615 62.649C132.428 61.2129 132.835 59.56 132.835 57.6903Z"
          fill="white"
        />
        <path
          d="M162.793 75.3303C159.24 75.3303 156.067 74.5716 153.273 73.0542C150.507 71.5368 148.337 69.4639 146.764 66.8355C145.191 64.18 144.404 61.1587 144.404 57.7716C144.404 54.3845 145.191 51.3632 146.764 48.7077C148.337 46.0252 150.507 43.9116 153.273 42.3671C156.067 40.7955 159.24 40.0097 162.793 40.0097C166.373 40.0097 169.533 40.7955 172.272 42.3671C175.012 43.9116 177.154 46.0252 178.7 48.7077C180.246 51.3632 181.019 54.3845 181.019 57.7716C181.019 61.1587 180.246 64.18 178.7 66.8355C177.154 69.4639 175.012 71.5368 172.272 73.0542C169.533 74.5716 166.373 75.3303 162.793 75.3303ZM162.793 66.7542C164.502 66.7542 165.98 66.3748 167.228 65.6161C168.502 64.8303 169.479 63.76 170.157 62.4052C170.862 61.0232 171.215 59.4652 171.215 57.731C171.215 55.9968 170.862 54.4387 170.157 53.0568C169.479 51.6748 168.502 50.591 167.228 49.8052C165.98 48.9923 164.502 48.5858 162.793 48.5858C161.084 48.5858 159.593 48.9923 158.318 49.8052C157.07 50.591 156.094 51.6748 155.389 53.0568C154.684 54.4387 154.331 55.9968 154.331 57.731C154.331 59.4652 154.684 61.0232 155.389 62.4052C156.094 63.76 157.07 64.8303 158.318 65.6161C159.593 66.3748 161.084 66.7542 162.793 66.7542Z"
          fill="white"
        />
        <path
          d="M181.852 40.9852H187.874V27.2877H198.126V40.9852H206.018V49.5613H198.126V61.6329C198.126 63.2316 198.383 64.4781 198.899 65.3723C199.414 66.2394 200.228 66.6729 201.34 66.6729C202.18 66.6729 202.872 66.5103 203.414 66.1852C203.957 65.8329 204.282 65.589 204.391 65.4536L208.052 72.851C207.89 73.0136 207.361 73.2981 206.466 73.7045C205.598 74.111 204.472 74.4768 203.089 74.8019C201.733 75.1542 200.2 75.3303 198.492 75.3303C195.427 75.3303 192.891 74.4497 190.884 72.6884C188.877 70.9 187.874 68.1361 187.874 64.3968V49.5613H181.852V40.9852Z"
          fill="white"
        />
        <path
          d="M210.541 74.3548V40.9852H220.834V74.3548H210.541ZM215.83 32.3684C214.121 32.3684 212.67 31.7723 211.477 30.58C210.31 29.3877 209.727 27.9652 209.727 26.3123C209.727 24.6594 210.324 23.2232 211.517 22.0039C212.711 20.7845 214.148 20.1748 215.83 20.1748C216.942 20.1748 217.959 20.4594 218.881 21.0284C219.803 21.5703 220.549 22.3019 221.118 23.2232C221.688 24.1445 221.973 25.1742 221.973 26.3123C221.973 27.9652 221.363 29.3877 220.142 30.58C218.949 31.7723 217.511 32.3684 215.83 32.3684Z"
          fill="white"
        />
        <path
          d="M224.212 40.9852H230.233V31.9213C230.233 28.6155 230.884 25.9058 232.186 23.7923C233.488 21.6516 235.17 20.0665 237.231 19.0368C239.292 17.98 241.421 17.4516 243.618 17.4516C246.303 17.4516 248.364 17.8174 249.802 18.549C251.239 19.2806 252.121 19.809 252.446 20.1342L248.459 27.7755C248.324 27.5858 247.944 27.2877 247.32 26.8813C246.724 26.4477 245.923 26.231 244.92 26.231C244.215 26.231 243.523 26.4071 242.845 26.7594C242.167 27.1116 241.611 27.7619 241.177 28.7103C240.743 29.6587 240.526 31.0542 240.526 32.8968V40.9852H249.273V49.5613H240.526V74.3548H230.233V49.5613H224.212V40.9852Z"
          fill="white"
        />
        <path
          d="M261.378 56.9587C261.378 59.9394 261.975 62.3239 263.168 64.1123C264.361 65.8736 266.287 66.7542 268.945 66.7542C271.63 66.7542 273.569 65.8736 274.763 64.1123C275.956 62.3239 276.553 59.9394 276.553 56.9587V40.9852H286.724V58.1374C286.724 61.5787 286.032 64.6 284.649 67.2013C283.265 69.7755 281.245 71.7807 278.587 73.2168C275.956 74.6258 272.742 75.3303 268.945 75.3303C265.175 75.3303 261.961 74.6258 259.303 73.2168C256.672 71.7807 254.665 69.7755 253.282 67.2013C251.899 64.6 251.207 61.5787 251.207 58.1374V40.9852H261.378V56.9587Z"
          fill="white"
        />
        <path
          d="M313.141 40.0097C315.42 40.0097 317.644 40.4839 319.813 41.4323C321.983 42.3536 323.76 43.8303 325.143 45.8626C326.553 47.8948 327.258 50.5503 327.258 53.829V74.3548H316.884V55.6174C316.884 52.8806 316.233 50.8484 314.931 49.5207C313.657 48.1929 311.975 47.529 309.887 47.529C308.531 47.529 307.229 47.9084 305.981 48.6671C304.761 49.3987 303.757 50.4284 302.971 51.7561C302.211 53.0568 301.832 54.5471 301.832 56.2271V74.3548H291.498V40.9852H301.832V46.3097C302.13 45.3884 302.808 44.44 303.866 43.4645C304.923 42.489 306.266 41.6761 307.893 41.0258C309.521 40.3484 311.27 40.0097 313.141 40.0097Z"
          fill="white"
        />
        <ellipse
          cx="59.2134"
          cy="4.23387"
          rx="4.2378"
          ry="4.23387"
          fill="#40E8DC"
        />
        <ellipse
          opacity="0.7"
          cx="123.457"
          cy="24.3952"
          rx="5.93293"
          ry="5.92742"
          fill="#A37EF3"
        />
        <ellipse
          cx="128.543"
          cy="107.379"
          rx="5.93292"
          ry="5.92742"
          fill="#5ACF4F"
        />
        <ellipse
          opacity="0.9"
          cx="152.274"
          cy="90.4436"
          rx="4.23781"
          ry="4.23387"
          fill="#3DE6DB"
        />
        <ellipse
          cx="269.238"
          cy="26.0887"
          rx="5.93291"
          ry="5.92742"
          fill="#F4EA1F"
        />
        <ellipse
          cx="314.159"
          cy="18.4678"
          rx="3.39026"
          ry="3.3871"
          fill="#F15252"
        />
        <ellipse
          cx="217.537"
          cy="89.5968"
          rx="8.4756"
          ry="8.46774"
          fill="#A37EF3"
        />
        <ellipse
          cx="81.9268"
          cy="89.5968"
          rx="8.47561"
          ry="8.46774"
          fill="#F15252"
        />
        <ellipse
          cx="250.591"
          cy="110.766"
          rx="4.23779"
          ry="4.23387"
          fill="#40E8DC"
        />
        <ellipse
          opacity="0.3"
          cx="326.024"
          cy="91.2903"
          rx="8.4756"
          ry="8.46774"
          fill="black"
        />
        <ellipse
          cx="287.037"
          cy="87.9032"
          rx="5.08537"
          ry="5.08065"
          fill="#5ACF4F"
        />
        <ellipse
          cx="169.085"
          cy="5.08065"
          rx="5.08537"
          ry="5.08065"
          fill="#F4EA1F"
        />
      </svg>
    </a>
  );
};

export default Logo;
