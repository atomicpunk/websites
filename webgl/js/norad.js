/* data types */
function tle_t(a, b, c, d, e, f, g, h, i, j) {
	"use strict";

/* Two-line-element satellite orbital data
	0 000000 000000   aaaaaaaaaaaaaa bbbbbbbbbb  ccccccc dddddddd 0  0000
	0 00000 eeeeeeee ffffffff ggggggg hhhhhhhh iiiiiiii jjjjjjjjjjjjjjjjj
*/
	this.epoch  = a; /* Epoch time (yrday.fracday) */
	this.xndt2o = b; /* Decay rate (rev/day^2) */
	this.xndd6o = c; /* */
	this.bstar  = d; /* */
	this.xincl  = e; /* Inclination (deg) */
	this.xnodeo = f; /* RA of node (deg) */
	this.eo     = g; /* Eccentricity */
	this.omegao = h; /* Arg of perigee (deg) */
	this.xmo    = i; /* */
	this.xno    = j; /* Mean motion (rev/day) */
	this.period = j;
}

function vector_t() {
	"use strict";

	this.x = 0.0;
	this.y = 0.0;
	this.z = 0.0;
	this.mag = 0.0;
}

function deep_arg_t() {
	"use strict";

	this.eosq = 0.0;
	this.sinio = 0.0;
	this.cosio = 0.0;
	this.betao = 0.0;
	this.aodp = 0.0;
	this.theta2 = 0.0;
	this.sing = 0.0;
	this.cosg = 0.0;
	this.betao2 = 0.0;
	this.xmdot = 0.0;
	this.omgdot = 0.0;
	this.xnodot = 0.0;
	this.xnodp = 0.0;
	this.xll = 0.0;
	this.omgadf = 0.0;
	this.xnode = 0.0;
	this.em = 0.0;
	this.xinc = 0.0;
	this.xn = 0.0;
	this.t = 0.0;
	this.ds50 = 0.0;
}

function Norad(earthradius) {
	"use strict";

	/* flags */
	var ALL_FLAGS				= -1;
	var SGP_INITIALIZED_FLAG	= 0x0001;
	var SGP4_INITIALIZED_FLAG	= 0x0002;
	var SDP4_INITIALIZED_FLAG	= 0x0004;
	var SGP8_INITIALIZED_FLAG	= 0x0008;
	var SDP8_INITIALIZED_FLAG	= 0x0010;
	var SIMPLE_FLAG				= 0x0020;
	var DEEP_SPACE_EPHEM_FLAG	= 0x0040;
	var LUNAR_TERMS_DONE_FLAG	= 0x0080;
	var NEW_EPHEMERIS_FLAG		= 0x0100;
	var DO_LOOP_FLAG			= 0x0200;
	var RESONANCE_FLAG			= 0x0400;
	var SYNCHRONOUS_FLAG		= 0x0800;
	var EPOCH_RESTART_FLAG		= 0x1000;

	/* flag handlers */
	var Flags = 0;
	function isFlagSet(flag)
	{
		return (Flags & flag);
	}
	function isFlagClear(flag)
	{
		return (~Flags & flag);
	}
	function SetFlag(flag)
	{
		Flags |= flag;
	}
	this.ClearFlag = ClearFlag;
	function ClearFlag(flag)
	{
		Flags &= ~flag;
	}

	/* Table of constant values */
	var de2ra    = 1.74532925E-2;
	var pi       = 3.1415926535898;
	var pio2     = 1.5707963267949;
	var x3pio2   = 4.71238898;
	var twopi    = 6.2831853071796;
	var e6a      = 1.0E-6;
	var tothrd   = 6.6666667E-1;
	var xj2      = 1.0826158E-3;
	var xj3      = -2.53881E-6;
	var xj4      = -1.65597E-6;
	var xke      = 7.43669161E-2;
	var earthrad   = (earthradius)?earthradius:6.378135E3;
	var xmnpda   = 1.44E3;
	var ae       = 1.0;
	var ck2      = 5.413079E-4;
	var ck4      = 6.209887E-7;
	var f        = 3.352779E-3;
	var ge       = 3.986008E5;
	var s        = 1.012229;
	var qoms2t   = 1.880279E-09;
	var secday   = 8.6400E4;
	var omega_E  = 1.0027379;
	var omega_ER = 6.3003881;
	var zns      = 1.19459E-5;
	var c1ss     = 2.9864797E-6;
	var zes      = 0.01675;
	var znl      = 1.5835218E-4;
	var c1l      = 4.7968065E-7;
	var zel      = 0.05490;
	var zcosis   = 0.91744867;
	var zsinis   = 0.39785416;
	var zsings   = -0.98088458;
	var zcosgs   = 0.1945905;
	var zcoshs   = 1;
	var zsinhs   = 0;
	var q22      = 1.7891679E-6;
	var q31      = 2.1460748E-6;
	var q33      = 2.2123015E-7;
	var g22      = 5.7686396;
	var g32      = 0.95240898;
	var g44      = 1.8014998;
	var g52      = 1.0508330;
	var g54      = 4.4108898;
	var root22   = 1.7891679E-6;
	var root32   = 3.7393792E-7;
	var root44   = 7.3636953E-9;
	var root52   = 1.1428639E-7;
	var root54   = 2.1765803E-9;
	var thdt     = 4.3752691E-3;
	var rho      = 1.5696615E-1;
	var dpinit   = 1; /* Deep-space initialization code */
	var dpsec    = 2; /* Deep-space secular code        */
	var dpper    = 3; /* Deep-space periodic code       */

	/* Math functions */
	function modf(val)
	{
		var i = val | 0;
		var f = val - i;
		return [i, f];
	}

	function ThetaG(epoch, deep_arg)
	{
		var year,day,UT,jd,ThetaG, val;

		val = modf(epoch*1E-3);
		year = val[0];
		day = val[1]*1E3;
		if(year < 57)
			year += 2000;
		else
			year += 1900;

		val = modf(day);
		day = val[0];
		UT = val[1];
		jd = Julian_Date_of_Year(year)+day;
		deep_arg.ds50 = jd-2433281.5+UT;
		ThetaG = FMod2p(6.3003880987*deep_arg.ds50+1.72944494);

		return (ThetaG);
	}

	function ThetaG_JD(jd)
	{
		var tmp,UT,TU,GMST,ThetaG,val;

		val = modf(jd + 0.5);
		tmp = val[0];
		UT = val[1];
		jd = jd - UT;
		TU = (jd-2451545.0)/36525;
		GMST = 24110.54841+TU*(8640184.812866+TU*(0.093104-TU* 6.2E-6));
		GMST = Modulus(GMST+secday*omega_E*UT,secday);
		ThetaG = twopi*GMST/secday;

		return (ThetaG);
	}

	function Julian_Date_of_Year(year)
	{
		var A,B,i;
		var jdoy;

		year = year-1;
		i = (year/100) | 0;
		A = i;
		i = (A/4) | 0;
		B = 2-A+i;
		i = (365.25*year) | 0;
		i += (30.6001*14) | 0;
		jdoy = i+1720994.5+B;
		return (jdoy);
	}

	function Modulus(arg1, arg2)
	{
		var i, ret_val;
		ret_val = arg1;
		i = (ret_val/arg2) | 0;
		ret_val -= i*arg2;
		if (ret_val < 0) ret_val += arg2;
		return (ret_val);
	}

	function FMod2p(x)
	{
		var i, ret_val;
		ret_val = x;
		i = (ret_val/twopi) | 0;
		ret_val -= i*twopi;
		if (ret_val < 0) ret_val += twopi;
		return (ret_val);
	}

	function AcTan(sinx, cosx)
	{
		if(cosx == 0)
		{
			if(sinx > 0)
				return (pio2);
			else
				return (x3pio2);
		}
		else
		{
			if(cosx > 0)
			{
				if(sinx > 0)
					return ( Math.atan(sinx/cosx) );
				else
					return ( twopi + Math.atan(sinx/cosx) );
			}
			else
				return ( pi + Math.atan(sinx/cosx) );
		}
	}

	/* SGP implementation */
	var ao,qo,xlo,d1o,d2o,d3o,d4o,omgdt,xnodot,c5,c6;

	this.sgp = sgp;
	function sgp(tsince, tle, pos, vel)
	{
		var temp, rdot, cosu, sinu, cos2u, po2no, sin2u, a, e,
			p, rr, u, ecose, esine, omgas, cosik, cosio, xinck,
			sinik, sinio, a1, c1, c2, c3, c4, d1, axnsl, aynsl,
			sinuk, rvdot, cosuk,dd1, dd2, coseo1, sineo1, pl,
			rk, po, uk, xl, su, ux, uy, uz, vx, vy, vz, pl2,
			xnodek, cosnok, xnodes, el2, eo1, r1, sinnok,
			xls, xmx, xmy, tem2, tem5, i;

		if (isFlagClear(SGP_INITIALIZED_FLAG))
		{
			SetFlag(SGP_INITIALIZED_FLAG);

			/* Initialization */
			c1 = ck2*1.5;
			c2 = ck2/4.0;
			c3 = ck2/2.0;
			r1 = ae;
			c4 = xj3*(r1*(r1*r1))/(ck2*4.0);
			cosio = Math.cos(tle.xincl);
			sinio = Math.sin(tle.xincl);
			dd1 = (xke/tle.xno);
			dd2 = tothrd;
			a1 = Math.pow(dd1, dd2);
			dd1 = (1.0-tle.eo*tle.eo);
			d1 = c1/a1/a1*(cosio*3.0*cosio-1.0)/Math.pow(dd1, 1.5);
			ao = a1*(1.0-d1*.33333333333333331-d1*d1-d1*
				1.654320987654321*d1*d1);
			po = ao*(1.0-tle.eo*tle.eo);
			qo = ao*(1.0-tle.eo);
			xlo = tle.xmo+tle.omegao+tle.xnodeo;
			d1o = c3*sinio*sinio;
			d2o = c2*(cosio*7.0*cosio-1.0);
			d3o = c1*cosio;
			d4o = d3o*sinio;
			po2no = tle.xno/(po*po);
			omgdt = c1*po2no*(cosio*5.0*cosio-1.0);
			xnodot = d3o*-2.0*po2no;
			c5 = c4*.5*sinio*(cosio*5.0+3.0)/(cosio+1.0);
			c6 = c4*sinio;
		} /* End of SGP() initialization */

		/* Update for secular gravity and atmospheric drag */
		a = tle.xno+(tle.xndt2o*2.0+tle.xndd6o*3.0*tsince)*tsince;
		dd1 = (tle.xno/a);
		dd2 = tothrd;
		a = ao*Math.pow(dd1, dd2);
		e = e6a;
		if (a > qo) e = 1.0-qo/a;
		p = a*(1.0-e*e);
		xnodes = tle.xnodeo+xnodot*tsince;
		omgas = tle.omegao+omgdt*tsince;
		r1 = xlo+(tle.xno+omgdt+xnodot+
			(tle.xndt2o+tle.xndd6o*tsince)*tsince)*tsince;
		xls = FMod2p(r1);

		/* Long period periodics */
		axnsl = e*Math.cos(omgas);
		aynsl = e*Math.sin(omgas)-c6/p;
		r1 = xls-c5/p*axnsl;
		xl = FMod2p(r1);

		/* Solve Kepler's equation */
		r1 = xl-xnodes;
		u = FMod2p(r1);
		eo1 = u;
		tem5 = 1.0;

		i = 0;
		do
		{
			sineo1 = Math.sin(eo1);
			coseo1 = Math.cos(eo1);
			if (Math.abs(tem5) < e6a) break;
			tem5 = 1.0-coseo1*axnsl-sineo1*aynsl;
			tem5 = (u-aynsl*coseo1+axnsl*sineo1-eo1)/tem5;
			tem2 = Math.abs(tem5);
			if (tem2 > 1.0) tem5 = tem2/tem5;
			eo1 += tem5;
		}
		while(i++ < 10);

		/* Short period preliminary quantities */
		ecose = axnsl*coseo1+aynsl*sineo1;
		esine = axnsl*sineo1-aynsl*coseo1;
		el2 = axnsl*axnsl+aynsl*aynsl;
		pl = a*(1.0-el2);
		pl2 = pl*pl;
		rr = a*(1.0-ecose);
		rdot = xke*Math.sqrt(a)/rr*esine;
		rvdot = xke*Math.sqrt(pl)/rr;
		temp = esine/(Math.sqrt(1.0-el2)+1.0);
		sinu = a/rr*(sineo1-aynsl-axnsl*temp);
		cosu = a/rr*(coseo1-axnsl+aynsl*temp);
		su = AcTan(sinu, cosu);

		/* Update for short periodics */
		sin2u = (cosu+cosu)*sinu;
		cos2u = 1.0-2.0*sinu*sinu;
		rk = rr+d1o/pl*cos2u;
		uk = su-d2o/pl2*sin2u;
		xnodek = xnodes+d3o*sin2u/pl2;
		xinck = tle.xincl+d4o/pl2*cos2u;

		/* Orientation vectors */
		sinuk = Math.sin(uk);
		cosuk = Math.cos(uk);
		sinnok = Math.sin(xnodek);
		cosnok = Math.cos(xnodek);
		sinik = Math.sin(xinck);
		cosik = Math.cos(xinck);
		xmx = -sinnok*cosik;
		xmy = cosnok*cosik;
		ux = xmx*sinuk+cosnok*cosuk;
		uy = xmy*sinuk+sinnok*cosuk;
		uz = sinik*sinuk;
		vx = xmx*cosuk-cosnok*sinuk;
		vy = xmy*cosuk-sinnok*sinuk;
		vz = sinik*cosuk;

		/* Position and velocity */
		pos.x = rk*ux;
		pos.y = rk*uy;
		pos.z = rk*uz;
		if(vel) {
			vel.x = rdot*ux;
			vel.y = rdot*uy;
			vel.z = rdot*uz;
			vel.x = rvdot*vx+vel.x;
			vel.y = rvdot*vy+vel.y;
			vel.z = rvdot*vz+vel.z;
		}

		/* cartesian conversion */
		pos.x = pos.x*earthrad/ae; /* Cartesian Position x */
		pos.y = pos.y*earthrad/ae; /* Cartesian Position y */
		pos.z = pos.z*earthrad/ae; /* Cartesian Position z */
		if(vel) {
			vel.x = vel.x*earthrad/(ae*xmnpda/86400.0);
			vel.y = vel.y*earthrad/(ae*xmnpda/86400.0);
			vel.z = vel.z*earthrad/(ae*xmnpda/86400.0);
		}
	}

	/* SDP4 implementation */
	var x3thm1,c1,x1mth2,c4,xnodcf,t2cof,xlcof,aycof,x7thm1;
	var deep_arg = new deep_arg_t();

	this.sdp4 = sdp4;
	function sdp4(tsince, tle, pos, vel)
	{
		var a,axn,ayn,aynl,beta,betal,capu,cos2u,cosepw,cosik,
			cosnok,cosu,cosuk,ecose,elsq,epw,esine,pl,theta4,
			rdot,rdotk,rfdot,rfdotk,rk,sin2u,sinepw,sinik,
			sinnok,sinu,sinuk,tempe,templ,tsq,u,uk,ux,uy,uz,
			vx,vy,vz,xinck,xl,xlt,xmam,xmdf,xmx,xmy,xnoddf,
			xnodek,xll,a1,a3ovk2,ao,c2,coef,coef1,x1m5th,
			xhdot1,del1,r,delo,eeta,eta,etasq,perige,
			psisq,tsi,qoms24,s4,pinvsq,temp,tempa,temp1,
			temp2,temp3,temp4,temp5,temp6,i;

		/* Initialization */
		if (isFlagClear(SDP4_INITIALIZED_FLAG))
		{
			SetFlag(SDP4_INITIALIZED_FLAG);

			/* Recover original mean motion (xnodp) and   */
			/* semimajor axis (aodp) from input elements. */
			a1 = Math.pow(xke/tle.xno,tothrd);
			deep_arg.cosio = Math.cos(tle.xincl);
			deep_arg.theta2 = deep_arg.cosio*deep_arg.cosio;
			x3thm1 = 3*deep_arg.theta2-1;
			deep_arg.eosq = tle.eo*tle.eo;
			deep_arg.betao2 = 1-deep_arg.eosq;
			deep_arg.betao = Math.sqrt(deep_arg.betao2);
			del1 = 1.5*ck2*x3thm1/(a1*a1*deep_arg.betao*deep_arg.betao2);
			ao = a1*(1-del1*(0.5*tothrd+del1*(1+134/81*del1)));
			delo = 1.5*ck2*x3thm1/(ao*ao*deep_arg.betao*deep_arg.betao2);
			deep_arg.xnodp = tle.xno/(1+delo);
			deep_arg.aodp = ao/(1-delo);

			/* For perigee below 156 km, the values */
			/* of s and qoms2t are altered.         */
			s4 = s;
			qoms24 = qoms2t;
			perige = (deep_arg.aodp*(1-tle.eo)-ae)*earthrad;
			if(perige < 156)
			{
				if(perige <= 98)
					s4 = 20;
				else
					s4 = perige-78;
				qoms24 = Math.pow((120-s4)*ae/earthrad,4);
				s4 = s4/earthrad+ae;
			}
			pinvsq = 1/(deep_arg.aodp*deep_arg.aodp*
				deep_arg.betao2*deep_arg.betao2);
			deep_arg.sing = Math.sin(tle.omegao);
			deep_arg.cosg = Math.cos(tle.omegao);
			tsi = 1/(deep_arg.aodp-s4);
			eta = deep_arg.aodp*tle.eo*tsi;
			etasq = eta*eta;
			eeta = tle.eo*eta;
			psisq = Math.abs(1-etasq);
			coef = qoms24*Math.pow(tsi,4);
			coef1 = coef/Math.pow(psisq,3.5);
			c2 = coef1*deep_arg.xnodp*(deep_arg.aodp*(1+1.5*etasq+eeta*
				(4+etasq))+0.75*ck2*tsi/psisq*x3thm1*(8+3*etasq*(8+etasq)));
			c1 = tle.bstar*c2;
			deep_arg.sinio = Math.sin(tle.xincl);
			a3ovk2 = -xj3/ck2*Math.pow(ae,3);
			x1mth2 = 1-deep_arg.theta2;
			c4 = 2*deep_arg.xnodp*coef1*deep_arg.aodp*deep_arg.betao2*
				(eta*(2+0.5*etasq)+tle.eo*(0.5+2*etasq)-2*ck2*tsi/
				(deep_arg.aodp*psisq)*(-3*x3thm1*(1-2*eeta+etasq*
				(1.5-0.5*eeta))+0.75*x1mth2*(2*etasq-eeta*(1+etasq))*
				Math.cos(2*tle.omegao)));
			theta4 = deep_arg.theta2*deep_arg.theta2;
			temp1 = 3*ck2*pinvsq*deep_arg.xnodp;
			temp2 = temp1*ck2*pinvsq;
			temp3 = 1.25*ck4*pinvsq*pinvsq*deep_arg.xnodp;
			deep_arg.xmdot = deep_arg.xnodp+0.5*temp1*deep_arg.betao*
				x3thm1+0.0625*temp2*deep_arg.betao*
				(13-78*deep_arg.theta2+137*theta4);
			x1m5th = 1-5*deep_arg.theta2;
			deep_arg.omgdot = -0.5*temp1*x1m5th+0.0625*temp2*
				(7-114*deep_arg.theta2+395*theta4)+
				temp3*(3-36*deep_arg.theta2+49*theta4);
			xhdot1 = -temp1*deep_arg.cosio;
			deep_arg.xnodot = xhdot1+(0.5*temp2*(4-19*deep_arg.theta2)+
				2*temp3*(3-7*deep_arg.theta2))*deep_arg.cosio;
			xnodcf = 3.5*deep_arg.betao2*xhdot1*c1;
			t2cof = 1.5*c1;
			xlcof = 0.125*a3ovk2*deep_arg.sinio*(3+5*deep_arg.cosio)/
				(1+deep_arg.cosio);
			aycof = 0.25*a3ovk2*deep_arg.sinio;
			x7thm1 = 7*deep_arg.theta2-1;

			/* initialize Deep() */
			Deep(dpinit, tle, deep_arg);
		}

		/* Update for secular gravity and atmospheric drag */
		xmdf = tle.xmo+deep_arg.xmdot*tsince;
		deep_arg.omgadf = tle.omegao+deep_arg.omgdot*tsince;
		xnoddf = tle.xnodeo+deep_arg.xnodot*tsince;
		tsq = tsince*tsince;
		deep_arg.xnode = xnoddf+xnodcf*tsq;
		tempa = 1-c1*tsince;
		tempe = tle.bstar*c4*tsince;
		templ = t2cof*tsq;
		deep_arg.xn = deep_arg.xnodp;

		/* Update for deep-space secular effects */
		deep_arg.xll = xmdf;
		deep_arg.t = tsince;

		Deep(dpsec, tle, deep_arg);

		xmdf = deep_arg.xll;
		a = Math.pow(xke/deep_arg.xn,tothrd)*tempa*tempa;
		deep_arg.em = deep_arg.em-tempe;
		xmam = xmdf+deep_arg.xnodp*templ;

		/* Update for deep-space periodic effects */
		deep_arg.xll = xmam;

		Deep(dpper, tle, deep_arg);

		xmam = deep_arg.xll;
		xl = xmam+deep_arg.omgadf+deep_arg.xnode;
		beta = Math.sqrt(1-deep_arg.em*deep_arg.em);
		deep_arg.xn = xke/Math.pow(a,1.5);

		/* Long period periodics */
		axn = deep_arg.em*Math.cos(deep_arg.omgadf);
		temp = 1/(a*beta*beta);
		xll = temp*xlcof*axn;
		aynl = temp*aycof;
		xlt = xl+xll;
		ayn = deep_arg.em*Math.sin(deep_arg.omgadf)+aynl;

		/* Solve Kepler's Equation */
		capu = FMod2p(xlt-deep_arg.xnode);
		temp2 = capu;

		i = 0;
		do
		{
			sinepw = Math.sin(temp2);
			cosepw = Math.cos(temp2);
			temp3 = axn*sinepw;
			temp4 = ayn*cosepw;
			temp5 = axn*cosepw;
			temp6 = ayn*sinepw;
			epw = (capu-temp4+temp3-temp2)/(1-temp5-temp6)+temp2;
			if(Math.abs(epw-temp2) <= e6a)
				break;
			temp2 = epw;
		}
		while( i++ < 10 );

		/* Short period preliminary quantities */
		ecose = temp5+temp6;
		esine = temp3-temp4;
		elsq = axn*axn+ayn*ayn;
		temp = 1-elsq;
		pl = a*temp;
		r = a*(1-ecose);
		temp1 = 1/r;
		rdot = xke*Math.sqrt(a)*esine*temp1;
		rfdot = xke*Math.sqrt(pl)*temp1;
		temp2 = a*temp1;
		betal = Math.sqrt(temp);
		temp3 = 1/(1+betal);
		cosu = temp2*(cosepw-axn+ayn*esine*temp3);
		sinu = temp2*(sinepw-ayn-axn*esine*temp3);
		u = AcTan(sinu,cosu);
		sin2u = 2*sinu*cosu;
		cos2u = 2*cosu*cosu-1;
		temp = 1/pl;
		temp1 = ck2*temp;
		temp2 = temp1*temp;

		/* Update for short periodics */
		rk = r*(1-1.5*temp2*betal*x3thm1)+0.5*temp1*x1mth2*cos2u;
		uk = u-0.25*temp2*x7thm1*sin2u;
		xnodek = deep_arg.xnode+1.5*temp2*deep_arg.cosio*sin2u;
		xinck = deep_arg.xinc+1.5*temp2*deep_arg.cosio*deep_arg.sinio*cos2u;
		rdotk = rdot-deep_arg.xn*temp1*x1mth2*sin2u;
		rfdotk = rfdot+deep_arg.xn*temp1*(x1mth2*cos2u+1.5*x3thm1);

		/* Orientation vectors */
		sinuk = Math.sin(uk);
		cosuk = Math.cos(uk);
		sinik = Math.sin(xinck);
		cosik = Math.cos(xinck);
		sinnok = Math.sin(xnodek);
		cosnok = Math.cos(xnodek);
		xmx = -sinnok*cosik;
		xmy = cosnok*cosik;
		ux = xmx*sinuk+cosnok*cosuk;
		uy = xmy*sinuk+sinnok*cosuk;
		uz = sinik*sinuk;
		vx = xmx*cosuk-cosnok*sinuk;
		vy = xmy*cosuk-sinnok*sinuk;
		vz = sinik*cosuk;

		/* Position and velocity */
		pos.x = rk*ux;
		pos.y = rk*uy;
		pos.z = rk*uz;
		if(vel) {
			vel.x = rdotk*ux+rfdotk*vx;
			vel.y = rdotk*uy+rfdotk*vy;
			vel.z = rdotk*uz+rfdotk*vz;
		}

		/* cartesian conversion */
		pos.x = pos.x*earthrad/ae; /* Cartesian Position x */
		pos.y = pos.y*earthrad/ae; /* Cartesian Position y */
		pos.z = pos.z*earthrad/ae; /* Cartesian Position z */
		if(vel) {
			vel.x = vel.x*earthrad/(ae*xmnpda/86400.0);
			vel.y = vel.y*earthrad/(ae*xmnpda/86400.0);
			vel.z = vel.z*earthrad/(ae*xmnpda/86400.0);
		}
	}

	/* Deep (used by SDP) */
	var thgr,xnq,xqncl,omegaq,zmol,zmos,savtsn,ee2,e3,xi2,
		xl2,xl3,xl4,xgh2,xgh3,xgh4,xh2,xh3,sse,ssi,ssg,xi3,
		se2,si2,sl2,sgh2,sh2,se3,si3,sl3,sgh3,sh3,sl4,sgh4,
		ssl,ssh,d3210,d3222,d4410,d4422,d5220,d5232,d5421,
		d5433,del1,del2,del3,fasx2,fasx4,fasx6,xlamo,xfact,
		xni,atime,stepp,stepn,step2,preep,pl,sghs,xli,
		d2201,d2211,sghl,sh1,pinc,pe,shs,zsingl,zcosgl,
		zsinhl,zcoshl,zsinil,zcosil;

	function Deep(ientry, tle, deep_arg)
	{
		var a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,ainv2,alfdp,aqnv,
			sgh,sini2,sinis,sinok,sh,si,sil,day,betdp,dalf,
			bfact,c,cc,cosis,cosok,cosq,ctem,f322,zx,zy,
			dbet,dls,eoc,eq,f2,f220,f221,f3,f311,f321,xnoh,
			f330,f441,f442,f522,f523,f542,f543,g200,g201,
			g211,pgh,ph,s1,s2,s3,s4,s5,s6,s7,se,sel,ses,xls,
			g300,g310,g322,g410,g422,g520,g521,g532,g533,gam,
			sinq,sinzf,sis,sl,sll,sls,stem,temp,temp1,x1,x2,
			x2li,x2omi,x3,x4,x5,x6,x7,x8,xl,xldot,xmao,xnddt,
			xndot,xno2,xnodce,xnoi,xomi,xpidot,z1,z11,z12,z13,
			z2,z21,z22,z23,z3,z31,z32,z33,ze,zf,zm,zn,
			zsing,zsinh,zsini,zcosg,zcosh,zcosi,delt=0,ft=0;

		switch(ientry)
		{
		case dpinit : /* Entrance for deep space initialization */
			thgr = ThetaG(tle.epoch, deep_arg);
			eq = tle.eo;
			xnq = deep_arg.xnodp;
			aqnv = 1/deep_arg.aodp;
			xqncl = tle.xincl;
			xmao = tle.xmo;
			xpidot = deep_arg.omgdot+deep_arg.xnodot;
			sinq = Math.sin(tle.xnodeo);
			cosq = Math.cos(tle.xnodeo);
			omegaq = tle.omegao;

			/* Initialize lunar solar terms */
			day = deep_arg.ds50+18261.5;  /*Days since 1900 Jan 0.5*/
			if (day != preep)
			{
				preep = day;
				xnodce = 4.5236020-9.2422029E-4*day;
				stem = Math.sin(xnodce);
				ctem = Math.cos(xnodce);
				zcosil = 0.91375164-0.03568096*ctem;
				zsinil = Math.sqrt(1-zcosil*zcosil);
				zsinhl = 0.089683511*stem/zsinil;
				zcoshl = Math.sqrt(1-zsinhl*zsinhl);
				c = 4.7199672+0.22997150*day;
				gam = 5.8351514+0.0019443680*day;
				zmol = FMod2p(c-gam);
				zx = 0.39785416*stem/zsinil;
				zy = zcoshl*ctem+0.91744867*zsinhl*stem;
				zx = AcTan(zx,zy);
				zx = gam+zx-xnodce;
				zcosgl = Math.cos(zx);
				zsingl = Math.sin(zx);
				zmos = 6.2565837+0.017201977*day;
				zmos = FMod2p(zmos);
			}

			/* Do solar terms */
			savtsn = 1E20;
			zcosg = zcosgs;
			zsing = zsings;
			zcosi = zcosis;
			zsini = zsinis;
			zcosh = cosq;
			zsinh = sinq;
			cc = c1ss;
			zn = zns;
			ze = zes;
			xnoi = 1/xnq;

			/* Loop breaks when Solar terms are done a second */
			/* time, after Lunar terms are initialized        */
			for(;;)
			{
				/* Solar terms done again after Lunar terms are done */
				a1 = zcosg*zcosh+zsing*zcosi*zsinh;
				a3 = -zsing*zcosh+zcosg*zcosi*zsinh;
				a7 = -zcosg*zsinh+zsing*zcosi*zcosh;
				a8 = zsing*zsini;
				a9 = zsing*zsinh+zcosg*zcosi*zcosh;
				a10 = zcosg*zsini;
				a2 = deep_arg.cosio*a7+ deep_arg.sinio*a8;
				a4 = deep_arg.cosio*a9+ deep_arg.sinio*a10;
				a5 = -deep_arg.sinio*a7+ deep_arg.cosio*a8;
				a6 = -deep_arg.sinio*a9+ deep_arg.cosio*a10;
				x1 = a1*deep_arg.cosg+a2*deep_arg.sing;
				x2 = a3*deep_arg.cosg+a4*deep_arg.sing;
				x3 = -a1*deep_arg.sing+a2*deep_arg.cosg;
				x4 = -a3*deep_arg.sing+a4*deep_arg.cosg;
				x5 = a5*deep_arg.sing;
				x6 = a6*deep_arg.sing;
				x7 = a5*deep_arg.cosg;
				x8 = a6*deep_arg.cosg;
				z31 = 12*x1*x1-3*x3*x3;
				z32 = 24*x1*x2-6*x3*x4;
				z33 = 12*x2*x2-3*x4*x4;
				z1 = 3*(a1*a1+a2*a2)+z31*deep_arg.eosq;
				z2 = 6*(a1*a3+a2*a4)+z32*deep_arg.eosq;
				z3 = 3*(a3*a3+a4*a4)+z33*deep_arg.eosq;
				z11 = -6*a1*a5+deep_arg.eosq*(-24*x1*x7-6*x3*x5);
				z12 = -6*(a1*a6+a3*a5)+ deep_arg.eosq*
					(-24*(x2*x7+x1*x8)-6*(x3*x6+x4*x5));
				z13 = -6*a3*a6+deep_arg.eosq*(-24*x2*x8-6*x4*x6);
				z21 = 6*a2*a5+deep_arg.eosq*(24*x1*x5-6*x3*x7);
				z22 = 6*(a4*a5+a2*a6)+ deep_arg.eosq*
					(24*(x2*x5+x1*x6)-6*(x4*x7+x3*x8));
				z23 = 6*a4*a6+deep_arg.eosq*(24*x2*x6-6*x4*x8);
				z1 = z1+z1+deep_arg.betao2*z31;
				z2 = z2+z2+deep_arg.betao2*z32;
				z3 = z3+z3+deep_arg.betao2*z33;
				s3 = cc*xnoi;
				s2 = -0.5*s3/deep_arg.betao;
				s4 = s3*deep_arg.betao;
				s1 = -15*eq*s4;
				s5 = x1*x3+x2*x4;
				s6 = x2*x3+x1*x4;
				s7 = x2*x4-x1*x3;
				se = s1*zn*s5;
				si = s2*zn*(z11+z13);
				sl = -zn*s3*(z1+z3-14-6*deep_arg.eosq);
				sgh = s4*zn*(z31+z33-6);
				sh = -zn*s2*(z21+z23);
				if (xqncl < 5.2359877E-2) sh = 0;
				ee2 = 2*s1*s6;
				e3 = 2*s1*s7;
				xi2 = 2*s2*z12;
				xi3 = 2*s2*(z13-z11);
				xl2 = -2*s3*z2;
				xl3 = -2*s3*(z3-z1);
				xl4 = -2*s3*(-21-9*deep_arg.eosq)*ze;
				xgh2 = 2*s4*z32;
				xgh3 = 2*s4*(z33-z31);
				xgh4 = -18*s4*ze;
				xh2 = -2*s2*z22;
				xh3 = -2*s2*(z23-z21);

				if(isFlagSet(LUNAR_TERMS_DONE_FLAG))
					break;

				/* Do lunar terms */
				sse = se;
				ssi = si;
				ssl = sl;
				ssh = sh/deep_arg.sinio;
				ssg = sgh-deep_arg.cosio*ssh;
				se2 = ee2;
				si2 = xi2;
				sl2 = xl2;
				sgh2 = xgh2;
				sh2 = xh2;
				se3 = e3;
				si3 = xi3;
				sl3 = xl3;
				sgh3 = xgh3;
				sh3 = xh3;
				sl4 = xl4;
				sgh4 = xgh4;
				zcosg = zcosgl;
				zsing = zsingl;
				zcosi = zcosil;
				zsini = zsinil;
				zcosh = zcoshl*cosq+zsinhl*sinq;
				zsinh = sinq*zcoshl-cosq*zsinhl;
				zn = znl;
				cc = c1l;
				ze = zel;
				SetFlag(LUNAR_TERMS_DONE_FLAG);
			}

			sse = sse+se;
			ssi = ssi+si;
			ssl = ssl+sl;
			ssg = ssg+sgh-deep_arg.cosio/deep_arg.sinio*sh;
			ssh = ssh+sh/deep_arg.sinio;

			/* Geopotential resonance initialization for 12 hour orbits */
			ClearFlag(RESONANCE_FLAG);
			ClearFlag(SYNCHRONOUS_FLAG);

			if( !((xnq < 0.0052359877) && (xnq > 0.0034906585)) )
			{
				if( (xnq < 0.00826) || (xnq > 0.00924) )
					return;
				if (eq < 0.5) return;
				SetFlag(RESONANCE_FLAG);
				eoc = eq*deep_arg.eosq;
				g201 = -0.306-(eq-0.64)*0.440;
				if (eq <= 0.65)
				{
					g211 = 3.616-13.247*eq+16.290*deep_arg.eosq;
					g310 = -19.302+117.390*eq-228.419*
						deep_arg.eosq+156.591*eoc;
					g322 = -18.9068+109.7927*eq-214.6334*
						deep_arg.eosq+146.5816*eoc;
					g410 = -41.122+242.694*eq-471.094*
						deep_arg.eosq+313.953*eoc;
					g422 = -146.407+841.880*eq-1629.014*
						deep_arg.eosq+1083.435*eoc;
					g520 = -532.114+3017.977*eq-5740*
						deep_arg.eosq+3708.276*eoc;
				}
				else
				{
					g211 = -72.099+331.819*eq-508.738*
						deep_arg.eosq+266.724*eoc;
					g310 = -346.844+1582.851*eq-2415.925*
						deep_arg.eosq+1246.113*eoc;
					g322 = -342.585+1554.908*eq-2366.899*
						deep_arg.eosq+1215.972*eoc;
					g410 = -1052.797+4758.686*eq-7193.992*
						deep_arg.eosq+3651.957*eoc;
					g422 = -3581.69+16178.11*eq-24462.77*
						deep_arg.eosq+ 12422.52*eoc;
					if (eq <= 0.715)
						g520 = 1464.74-4664.75*eq+3763.64*deep_arg.eosq;
					else
						g520 = -5149.66+29936.92*eq-54087.36*
					deep_arg.eosq+31324.56*eoc;
				}

				if (eq < 0.7)
				{
					g533 = -919.2277+4988.61*eq-9064.77*
						deep_arg.eosq+5542.21*eoc;
					g521 = -822.71072+4568.6173*eq-8491.4146*
						deep_arg.eosq+5337.524*eoc;
					g532 = -853.666+4690.25*eq-8624.77*
						deep_arg.eosq+ 5341.4*eoc;
				}
				else
				{
					g533 = -37995.78+161616.52*eq-229838.2*
						deep_arg.eosq+109377.94*eoc;
					g521 = -51752.104+218913.95*eq-309468.16*
						deep_arg.eosq+146349.42*eoc;
					g532 = -40023.88+170470.89*eq-242699.48*
						deep_arg.eosq+115605.82*eoc;
				}

				sini2 = deep_arg.sinio*deep_arg.sinio;
				f220 = 0.75*(1+2*deep_arg.cosio+deep_arg.theta2);
				f221 = 1.5*sini2;
				f321 = 1.875*deep_arg.sinio*(1-2*
					deep_arg.cosio-3*deep_arg.theta2);
				f322 = -1.875*deep_arg.sinio*(1+2*
					deep_arg.cosio-3*deep_arg.theta2);
				f441 = 35*sini2*f220;
				f442 = 39.3750*sini2*sini2;
				f522 = 9.84375*deep_arg.sinio*(sini2*(1-2*deep_arg.cosio-5*
					deep_arg.theta2)+0.33333333*(-2+4*deep_arg.cosio+
					6*deep_arg.theta2));
				f523 = deep_arg.sinio*(4.92187512*sini2*(-2-4*
					deep_arg.cosio+10*deep_arg.theta2)+6.56250012
					*(1+2*deep_arg.cosio-3*deep_arg.theta2));
				f542 = 29.53125*deep_arg.sinio*(2-8*
					deep_arg.cosio+deep_arg.theta2*
					(-12+8*deep_arg.cosio+10*deep_arg.theta2));
				f543 = 29.53125*deep_arg.sinio*(-2-8*deep_arg.cosio+
					deep_arg.theta2*(12+8*deep_arg.cosio-10*
			  		deep_arg.theta2));
				xno2 = xnq*xnq;
				ainv2 = aqnv*aqnv;
				temp1 = 3*xno2*ainv2;
				temp = temp1*root22;
				d2201 = temp*f220*g201;
				d2211 = temp*f221*g211;
				temp1 = temp1*aqnv;
				temp = temp1*root32;
				d3210 = temp*f321*g310;
				d3222 = temp*f322*g322;
				temp1 = temp1*aqnv;
				temp = 2*temp1*root44;
				d4410 = temp*f441*g410;
				d4422 = temp*f442*g422;
				temp1 = temp1*aqnv;
				temp = temp1*root52;
				d5220 = temp*f522*g520;
				d5232 = temp*f523*g532;
				temp = 2*temp1*root54;
				d5421 = temp*f542*g521;
				d5433 = temp*f543*g533;
				xlamo = xmao+tle.xnodeo+tle.xnodeo-thgr-thgr;
				bfact = deep_arg.xmdot+deep_arg.xnodot+
					deep_arg.xnodot-thdt-thdt;
				bfact = bfact+ssl+ssh+ssh;
	  		}
			else
			{
				SetFlag(RESONANCE_FLAG);
				SetFlag(SYNCHRONOUS_FLAG);
				/* Synchronous resonance terms initialization */
				g200 = 1+deep_arg.eosq*(-2.5+0.8125*deep_arg.eosq);
				g310 = 1+2*deep_arg.eosq;
				g300 = 1+deep_arg.eosq*(-6+6.60937*deep_arg.eosq);
				f220 = 0.75*(1+deep_arg.cosio)*(1+deep_arg.cosio);
				f311 = 0.9375*deep_arg.sinio*deep_arg.sinio*
					(1+3*deep_arg.cosio)-0.75*(1+deep_arg.cosio);
				f330 = 1+deep_arg.cosio;
				f330 = 1.875*f330*f330*f330;
				del1 = 3*xnq*xnq*aqnv*aqnv;
				del2 = 2*del1*f220*g200*q22;
				del3 = 3*del1*f330*g300*q33*aqnv;
				del1 = del1*f311*g310*q31*aqnv;
				fasx2 = 0.13130908;
				fasx4 = 2.8843198;
				fasx6 = 0.37448087;
				xlamo = xmao+tle.xnodeo+tle.omegao-thgr;
				bfact = deep_arg.xmdot+xpidot-thdt;
				bfact = bfact+ssl+ssg+ssh;
			}

			xfact = bfact-xnq;

			/* Initialize integrator */
			xli = xlamo;
			xni = xnq;
			atime = 0;
			stepp = 720;
			stepn = -720;
			step2 = 259200;
			/* End case dpinit: */
			break;

		case dpsec: /* Entrance for deep space secular effects */
			deep_arg.xll = deep_arg.xll+ssl*deep_arg.t;
			deep_arg.omgadf = deep_arg.omgadf+ssg*deep_arg.t;
			deep_arg.xnode = deep_arg.xnode+ssh*deep_arg.t;
			deep_arg.em = tle.eo+sse*deep_arg.t;
			deep_arg.xinc = tle.xincl+ssi*deep_arg.t;
			if (deep_arg.xinc < 0)
			{
				deep_arg.xinc = -deep_arg.xinc;
				deep_arg.xnode = deep_arg.xnode + pi;
				deep_arg.omgadf = deep_arg.omgadf-pi;
			}
			if( isFlagClear(RESONANCE_FLAG) )
				return;
				do
			{
				if( (atime == 0) ||
					((deep_arg.t >= 0) && (atime <  0)) ||
					((deep_arg.t <  0) && (atime >= 0)) )
				{
					/* Epoch restart */
					if( deep_arg.t >= 0 )
						delt = stepp;
					else
						delt = stepn;

					atime = 0;
					xni = xnq;
					xli = xlamo;
				}
				else
				{
					if( Math.abs(deep_arg.t) >= Math.abs(atime) )
					{
						if ( deep_arg.t > 0 )
							delt = stepp;
						else
							delt = stepn;
					}
				}

				do
				{
					if ( Math.abs(deep_arg.t-atime) >= stepp )
					{
						SetFlag(DO_LOOP_FLAG);
						ClearFlag(EPOCH_RESTART_FLAG);
					}
					else
					{
						ft = deep_arg.t-atime;
						ClearFlag(DO_LOOP_FLAG);
					}

					if( Math.abs(deep_arg.t) < Math.abs(atime) )
					{
						if (deep_arg.t >= 0)
							delt = stepn;
						else
							delt = stepp;
						SetFlag(DO_LOOP_FLAG | EPOCH_RESTART_FLAG);
					}

					/* Dot terms calculated */
					if( isFlagSet(SYNCHRONOUS_FLAG) )
					{
						xndot = del1*Math.sin(xli-fasx2)+del2*Math.sin(2*(xli-fasx4))
							+del3*Math.sin(3*(xli-fasx6));
						xnddt = del1*Math.cos(xli-fasx2)+2*del2*Math.cos(2*(xli-fasx4))
							+3*del3*Math.cos(3*(xli-fasx6));
					}
					else
					{
						xomi = omegaq+deep_arg.omgdot*atime;
						x2omi = xomi+xomi;
						x2li = xli+xli;
						xndot = d2201*Math.sin(x2omi+xli-g22)
							+d2211*Math.sin(xli-g22)
							+d3210*Math.sin(xomi+xli-g32)
							+d3222*Math.sin(-xomi+xli-g32)
							+d4410*Math.sin(x2omi+x2li-g44)
							+d4422*Math.sin(x2li-g44)
							+d5220*Math.sin(xomi+xli-g52)
							+d5232*Math.sin(-xomi+xli-g52)
							+d5421*Math.sin(xomi+x2li-g54)
							+d5433*Math.sin(-xomi+x2li-g54);
						xnddt = d2201*Math.cos(x2omi+xli-g22)
							+d2211*Math.cos(xli-g22)
							+d3210*Math.cos(xomi+xli-g32)
							+d3222*Math.cos(-xomi+xli-g32)
							+d5220*Math.cos(xomi+xli-g52)
							+d5232*Math.cos(-xomi+xli-g52)
							+2*(d4410*Math.cos(x2omi+x2li-g44)
							+d4422*Math.cos(x2li-g44)
							+d5421*Math.cos(xomi+x2li-g54)
							+d5433*Math.cos(-xomi+x2li-g54));
					} /* End of if (isFlagSet(SYNCHRONOUS_FLAG)) */

					xldot = xni+xfact;
					xnddt = xnddt*xldot;

					if(isFlagSet(DO_LOOP_FLAG))
					{
						xli = xli+xldot*delt+xndot*step2;
						xni = xni+xndot*delt+xnddt*step2;
						atime = atime+delt;
					}
				}
				while(isFlagSet(DO_LOOP_FLAG) && isFlagClear(EPOCH_RESTART_FLAG));
			}
			while(isFlagSet(DO_LOOP_FLAG) && isFlagSet(EPOCH_RESTART_FLAG));

			deep_arg.xn = xni+xndot*ft+xnddt*ft*ft*0.5;
			xl = xli+xldot*ft+xndot*ft*ft*0.5;
			temp = -deep_arg.xnode+thgr+deep_arg.t*thdt;

			if (isFlagClear(SYNCHRONOUS_FLAG))
				deep_arg.xll = xl+temp+temp;
			else
				deep_arg.xll = xl-deep_arg.omgadf+temp;

			break;
			/*End case dpsec: */

		case dpper: /* Entrance for lunar-solar periodics */
			sinis = Math.sin(deep_arg.xinc);
			cosis = Math.cos(deep_arg.xinc);
			if (Math.abs(savtsn-deep_arg.t) >= 30)
			{
				savtsn = deep_arg.t;
				zm = zmos+zns*deep_arg.t;
				zf = zm+2*zes*Math.sin(zm);
				sinzf = Math.sin(zf);
				f2 = 0.5*sinzf*sinzf-0.25;
				f3 = -0.5*sinzf*Math.cos(zf);
				ses = se2*f2+se3*f3;
				sis = si2*f2+si3*f3;
				sls = sl2*f2+sl3*f3+sl4*sinzf;
				sghs = sgh2*f2+sgh3*f3+sgh4*sinzf;
				shs = sh2*f2+sh3*f3;
				zm = zmol+znl*deep_arg.t;
				zf = zm+2*zel*Math.sin(zm);
				sinzf = Math.sin(zf);
				f2 = 0.5*sinzf*sinzf-0.25;
				f3 = -0.5*sinzf*Math.cos(zf);
				sel = ee2*f2+e3*f3;
				sil = xi2*f2+xi3*f3;
				sll = xl2*f2+xl3*f3+xl4*sinzf;
				sghl = xgh2*f2+xgh3*f3+xgh4*sinzf;
				sh1 = xh2*f2+xh3*f3;
				pe = ses+sel;
				pinc = sis+sil;
				pl = sls+sll;
			}

			pgh = sghs+sghl;
			ph = shs+sh1;
			deep_arg.xinc = deep_arg.xinc+pinc;
			deep_arg.em = deep_arg.em+pe;

			if (xqncl >= 0.2)
			{
				/* Apply periodics directly */
				ph = ph/deep_arg.sinio;
				pgh = pgh-deep_arg.cosio*ph;
				deep_arg.omgadf = deep_arg.omgadf+pgh;
				deep_arg.xnode = deep_arg.xnode+ph;
				deep_arg.xll = deep_arg.xll+pl;
			}
			else
			{
				/* Apply periodics with Lyddane modification */
				sinok = Math.sin(deep_arg.xnode);
				cosok = Math.cos(deep_arg.xnode);
				alfdp = sinis*sinok;
				betdp = sinis*cosok;
				dalf = ph*cosok+pinc*cosis*sinok;
				dbet = -ph*sinok+pinc*cosis*cosok;
				alfdp = alfdp+dalf;
				betdp = betdp+dbet;
				deep_arg.xnode = FMod2p(deep_arg.xnode);
				xls = deep_arg.xll+deep_arg.omgadf+cosis*deep_arg.xnode;
				dls = pl+pgh-pinc*deep_arg.xnode*sinis;
				xls = xls+dls;
				xnoh = deep_arg.xnode;
				deep_arg.xnode = AcTan(alfdp,betdp);

				/* This is a patch to Lyddane modification */
				/* suggested by Rob Matson. */
				if(Math.abs(xnoh-deep_arg.xnode) > pi)
				{
					if(deep_arg.xnode < xnoh)
						deep_arg.xnode +=twopi;
					else
						deep_arg.xnode -=twopi;
				}

				deep_arg.xll = deep_arg.xll+pl;
				deep_arg.omgadf = xls-deep_arg.xll-Math.cos(deep_arg.xinc)*
				deep_arg.xnode;
			}
			break;
		}
	}

	this.is_deep_space = is_deep_space;
	function is_deep_space(tle)
	{
		var ao,xnodp,dd1,dd2,delo,temp,a1,del1,r1;

		ClearFlag(ALL_FLAGS);

		/* Preprocess tle set */
		tle.xnodeo *= de2ra;
		tle.omegao *= de2ra;
		tle.xmo *= de2ra;
		tle.xincl *= de2ra;
		temp = twopi/xmnpda/xmnpda;
		tle.xno = tle.xno*temp*xmnpda;
		tle.xndt2o *= temp;
		tle.xndd6o = tle.xndd6o*temp/xmnpda;
		tle.bstar /= ae;

		/* Period > 225 minutes is deep space */
		dd1 = (xke/tle.xno);
		dd2 = tothrd;
		a1 = Math.pow(dd1, dd2);
		r1 = Math.cos(tle.xincl);
		dd1 = (1.0-tle.eo*tle.eo);
		temp = ck2*1.5*(r1*r1*3.0-1.0)/Math.pow(dd1, 1.5);
		del1 = temp/(a1*a1);
		ao = a1*(1.0-del1*(tothrd*0.5+del1*
			(del1*1.654320987654321+1.0)));
		delo = temp/(ao*ao);
		xnodp = tle.xno/(delo+1.0);
		tle.period = twopi/xnodp;

		/* Select a deep-space/near-earth ephemeris */
		if (twopi/xnodp/xmnpda >= 0.15625) {
			SetFlag(DEEP_SPACE_EPHEM_FLAG);
			return true;
		} else {
			ClearFlag(DEEP_SPACE_EPHEM_FLAG);
			return false;
		}
	}
}

Norad.prototype.getTrack = function(tle, start, end, delta) {
	var vel = new vector_t();
	var pos = new vector_t();
	var track = [];

	var deep = this.is_deep_space(tle);
	for(var tsince = start; tsince <= end; tsince += delta)
	{
		if(deep)
			this.sdp4(tsince, tle, pos, vel);
		else
			this.sgp(tsince, tle, pos, vel);

		track.push(pos.x, pos.y, pos.z);
	}

	return track;
}

Norad.prototype.getOrbit = function(tle, points) {
	var pos = new vector_t();
	var track = [];

	var deep = this.is_deep_space(tle);
	var delta = tle.period/points;
	for(var t = 0; t < tle.period; t += delta)
	{
		if(deep)
			this.sdp4(t, tle, pos);
		else
			this.sgp(t, tle, pos);

		track.push(pos.x, pos.y, pos.z);
	}

	return track;
}
