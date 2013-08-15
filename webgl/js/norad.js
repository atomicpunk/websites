/* global interface opject */
var norad = new Norad();

/* data types */
function tle_t() {
	"use strict";

    this.epoch = 0.0;  // 3
    this.xndt2o = 0.0; // 4
    this.xndd6o = 0.0; // 5
    this.bstar = 0.0;  // 6
    this.xincl = 0.0;  // a
    this.xnodeo = 0.0; // b
    this.eo = 0.0;     // c
    this.omegao = 0.0; // d
    this.xmo = 0.0;    // e
    this.xno = 0.0;    // f
}

function vector_t() {
	"use strict";

	this.x = 0.0;
	this.y = 0.0;
	this.z = 0.0;
	this.mag = 0.0;
}

function Norad() {
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
	var xkmper   = 6.378135E3;
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
	function FMod2p(x)
	{
		var i, ret_val;
		ret_val = x;
		i = ret_val/twopi;
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
		vel.x = rdot*ux;
		vel.y = rdot*uy;
		vel.z = rdot*uz;
		vel.x = rvdot*vx+vel.x;
		vel.y = rvdot*vy+vel.y;
		vel.z = rvdot*vz+vel.z;
	}
}
